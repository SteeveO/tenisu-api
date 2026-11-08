// Inserts the missing initial players and uploads the images. Idempotent (D22, D37).
// With DYNAMODB_ENDPOINT set (local), it also creates the table and the bucket;
// on AWS these belong to Terraform.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { seedPlayers } from '../src/adapters/dynamodb-player-seed';
import { playersTableDefinition } from '../src/adapters/dynamodb-table';
import { COUNTRIES } from '../src/domain/countries.generated';
import { flagKey } from '../src/domain/image-keys';
import type { Player } from '../src/domain/player';
import { requireEnv } from '../src/env';
import {
  IMAGES_DIRECTORY,
  initialPicturePath,
  loadInitialPlayers,
} from '../src/seed/initial-players';

const SERVICE_START_ATTEMPTS = 60;
const SERVICE_START_DELAY_MS = 1000;

const tableName = requireEnv('PLAYERS_TABLE');
const bucketName = requireEnv('IMAGES_BUCKET');
const dynamoDbEndpoint = process.env['DYNAMODB_ENDPOINT'];
const s3Endpoint = process.env['S3_ENDPOINT'];

const dynamoDb = new DynamoDBClient({ endpoint: dynamoDbEndpoint });
const s3 = new S3Client({ endpoint: s3Endpoint, forcePathStyle: s3Endpoint !== undefined });

async function createLocalResources(): Promise<void> {
  try {
    await dynamoDb.send(new CreateTableCommand(playersTableDefinition(tableName)));
  } catch (error) {
    if (!(error instanceof ResourceInUseException)) {
      throw error;
    }
  }

  try {
    await s3.send(
      new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: { LocationConstraint: 'eu-north-1' },
      }),
    );
  } catch (error) {
    if (!(error instanceof BucketAlreadyOwnedByYou)) {
      throw error;
    }
  }
}

/** The containers start in parallel: the emulators may not be listening yet. */
async function retryWhileServicesStart(action: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await action();
      return;
    } catch (error) {
      if (attempt === SERVICE_START_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, SERVICE_START_DELAY_MS));
    }
  }
}

async function uploadFile(key: string, path: string, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: await readFile(path),
      ContentType: contentType,
    }),
  );
}

async function uploadImages(players: readonly Player[]): Promise<void> {
  await Promise.all([
    ...players.flatMap((player) =>
      player.pictureKey === null
        ? []
        : [uploadFile(player.pictureKey, initialPicturePath(player.id), 'image/webp')],
    ),
    ...COUNTRIES.map((country) => {
      const key = flagKey(country);
      return uploadFile(key, join(IMAGES_DIRECTORY, key), 'image/svg+xml');
    }),
  ]);
}

// Validated before any write: an invalid file fails the seed and changes nothing.
const players = await loadInitialPlayers();

if (dynamoDbEndpoint !== undefined) {
  await retryWhileServicesStart(createLocalResources);
}

// Images first: a player must never reference a picture that is not stored yet.
await uploadImages(players);
const inserted = await seedPlayers(DynamoDBDocumentClient.from(dynamoDb), tableName, players);

console.log(`Inserted ${String(inserted)} of ${String(players.length)} players into ${tableName}`);
