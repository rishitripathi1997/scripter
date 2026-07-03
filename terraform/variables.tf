variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix for resource names"
  type        = string
  default     = "connectx-scripts"
}

variable "environment" {
  description = "Environment label"
  type        = string
  default     = "dev"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GB"
  type        = number
  default     = 30
}

variable "git_repo_url" {
  description = "Git repository URL to clone on EC2"
  type        = string
  default     = "https://github.com/rishitripathi1997/scripter.git"
}

variable "git_branch" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}

variable "ssh_public_key" {
  description = "SSH public key for EC2 access. Leave empty to auto-generate a key pair (saved to terraform/keys/)."
  type        = string
  default     = ""
}

variable "allow_ssh_from_cidr" {
  description = "CIDR allowed to SSH to EC2 (port 22)"
  type        = string
  default     = "0.0.0.0/0"
}

variable "admin_username" {
  description = "Initial admin username seeded on first boot"
  type        = string
  default     = "admin"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC (created when account has no default VPC)"
  type        = string
  default     = "10.20.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
  default     = "10.20.1.0/24"
}
