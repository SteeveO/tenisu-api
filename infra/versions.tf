terraform {
  required_version = "~> 1.17"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }

  # Created by infra/bootstrap. Backend settings cannot use variables.
  backend "s3" {
    bucket       = "tenisu-terraform-state-112232724712"
    key          = "api/terraform.tfstate"
    region       = "eu-north-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = local.region

  default_tags {
    tags = {
      Project   = "tenisu"
      ManagedBy = "terraform"
    }
  }
}

locals {
  region        = "eu-north-1"
  function_name = "tenisu-api"
}

data "aws_caller_identity" "current" {}
