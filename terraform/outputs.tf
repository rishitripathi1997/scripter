output "app_url" {
  description = "URL to open the ConnectX Scripts app"
  value       = local.app_url
}

output "public_ip" {
  description = "Elastic IP of the EC2 instance"
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.app.id
}

output "s3_bucket" {
  description = "S3 bucket for scripts and run logs"
  value       = aws_s3_bucket.app.bucket
}

output "ssh_command" {
  description = "SSH into the EC2 instance"
  value       = "ssh -i <private-key> ec2-user@${aws_eip.app.public_ip}"
}

output "ssh_private_key_path" {
  description = "Path to auto-generated SSH private key (empty if you supplied ssh_public_key)"
  value       = var.ssh_public_key == "" ? local_sensitive_file.ssh_private_key[0].filename : "(you supplied ssh_public_key)"
}

output "admin_username" {
  description = "Initial admin login username"
  value       = var.admin_username
}

output "admin_password" {
  description = "Initial admin login password"
  value       = random_password.admin_password.result
  sensitive   = true
}

output "deploy_command" {
  description = "Redeploy after pushing code changes"
  value       = "ssh -i <private-key> ec2-user@${aws_eip.app.public_ip} 'sudo /opt/connectx-scripts/scripts/deploy.sh'"
}

output "bootstrap_note" {
  description = "First boot can take several minutes while Docker images build"
  value       = "Wait 5-10 minutes after terraform apply, then open ${local.app_url} and log in."
}
