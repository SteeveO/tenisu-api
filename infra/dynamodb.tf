# Same layout as playersTableDefinition in src/adapters/dynamodb-table.ts (D20).
resource "aws_dynamodb_table" "players" {
  name         = "tenisu-players"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "entityType"
    type = "S"
  }

  global_secondary_index {
    name            = "entityType"
    projection_type = "ALL"

    key_schema {
      attribute_name = "entityType"
      key_type       = "HASH"
    }
  }
}
