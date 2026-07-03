resource "random_password" "postgres" {
  length  = 24
  special = false
}

resource "random_password" "secret_key" {
  length  = 48
  special = false
}

resource "random_password" "encryption_key" {
  length  = 32
  special = true
}

resource "random_password" "admin_password" {
  length  = 16
  special = false
}

resource "tls_private_key" "ssh" {
  count     = var.ssh_public_key == "" ? 1 : 0
  algorithm = "ED25519"
}

resource "local_sensitive_file" "ssh_private_key" {
  count           = var.ssh_public_key == "" ? 1 : 0
  content         = tls_private_key.ssh[0].private_key_openssh
  filename        = "${path.module}/keys/${var.project_name}-key.pem"
  file_permission = "0600"
}

resource "aws_key_pair" "app" {
  key_name   = "${local.name_prefix}-key"
  public_key = var.ssh_public_key != "" ? var.ssh_public_key : tls_private_key.ssh[0].public_key_openssh
}

resource "aws_s3_bucket" "app" {
  bucket = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "app" {
  bucket = aws_s3_bucket.app.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "app" {
  bucket = aws_s3_bucket.app.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app" {
  bucket = aws_s3_bucket.app.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_s3" {
  name = "${local.name_prefix}-s3-access"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.app.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.app.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "ec2_sts" {
  name = "${local.name_prefix}-sts-assume"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["sts:AssumeRole"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-sg"
  description = "ConnectX Scripts app security group"
  vpc_id      = aws_vpc.app.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allow_ssh_from_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-eip"
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.app.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  root_block_device {
    volume_size = var.root_volume_size_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/user-data.sh.tpl", {
    git_repo_url      = var.git_repo_url
    git_branch        = var.git_branch
    postgres_password = random_password.postgres.result
    secret_key        = random_password.secret_key.result
    encryption_key    = random_password.encryption_key.result
    admin_username    = var.admin_username
    admin_password    = random_password.admin_password.result
    s3_bucket         = aws_s3_bucket.app.bucket
    aws_region        = var.aws_region
    cors_origin       = "http://${aws_eip.app.public_ip}"
  })

  user_data_replace_on_change = true

  tags = {
    Name = "${local.name_prefix}-app"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
