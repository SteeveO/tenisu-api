locals {
  account_id   = data.aws_caller_identity.current.account_id
  function_arn = "arn:aws:lambda:${local.region}:${local.account_id}:function:${local.function_name}"
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [local.function_arn]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "tenisu-lambda-api"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Only what the code calls: Query goes through the index, and a transaction
# needs PutItem on the table.
data "aws_iam_policy_document" "api" {
  statement {
    sid       = "WriteLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.api.arn}:*"]
  }

  statement {
    sid       = "ReadWritePlayers"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.players.arn]
  }

  statement {
    sid       = "ListPlayers"
    actions   = ["dynamodb:Query"]
    resources = ["${aws_dynamodb_table.players.arn}/index/entityType"]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "tenisu-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}
