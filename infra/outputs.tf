output "api_url" {
  description = "Public URL of the API"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "players_table" {
  value = aws_dynamodb_table.players.name
}

output "images_bucket" {
  value = aws_s3_bucket.images.bucket
}

output "cdn_url" {
  description = "Public URL of the images"
  value       = "https://${aws_cloudfront_distribution.images.domain_name}"
}
