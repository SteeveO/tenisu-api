# Built by `npm run build`.
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../dist/api"
  output_path = "${path.module}/../dist/api.zip"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}

resource "aws_lambda_function" "api" {
  function_name    = local.function_name
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  architectures    = ["arm64"]
  handler          = "handler.handler"
  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256
  memory_size      = 256
  timeout          = 10

  # Caps simultaneous executions, hence the Lambda cost (D32).
  reserved_concurrent_executions = 10

  environment {
    variables = {
      # Readable stack traces in CloudWatch from the minified bundle.
      NODE_OPTIONS  = "--enable-source-maps"
      PLAYERS_TABLE = aws_dynamodb_table.players.name
      CDN_BASE_URL  = "https://${aws_cloudfront_distribution.images.domain_name}"
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*"
}
