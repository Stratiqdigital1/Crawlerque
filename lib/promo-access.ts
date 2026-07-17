import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import { PromoAccessStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PROMO_REPORT_TYPES = [
  "seo",
  "technical",
  "traffic",
  "keywords",
  "competitors",
  "ai",
  "backlinks",
  "recommendations",
  "localSeo",
  "content",
  "serp",
] as const;

function getEncryptionKey() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET environment variable."
    );
  }

  return createHash("sha256")
    .update(secret)
    .digest();
}

export function hashPromoToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export function encryptPromoToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptPromoToken(value: string) {
  const [ivValue, tagValue, encryptedValue] =
    value.split(".");

  if (
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error("Invalid encrypted promo token.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivValue, "base64url")
  );

  decipher.setAuthTag(
    Buffer.from(tagValue, "base64url")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(
        encryptedValue,
        "base64url"
      )
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function createPromoToken() {
  const token = `cqp_${randomBytes(32).toString(
    "base64url"
  )}`;

  return {
    token,
    tokenHash: hashPromoToken(token),
    tokenEncrypted: encryptPromoToken(token),
    tokenPrefix: token.slice(0, 12),
  };
}

export function isPromoAccessExpired(
  expiresAt: Date | null
) {
  return Boolean(
    expiresAt &&
      expiresAt.getTime() <= Date.now()
  );
}

export async function getPromoAccessForSession(
  payload: {
    userId?: unknown;
    promoAccessId?: unknown;
  }
) {
  const userId = String(
    payload?.userId || ""
  );

  const promoAccessId = String(
    payload?.promoAccessId || ""
  );

  if (!userId || !promoAccessId) {
    return null;
  }

  const access =
    await prisma.promoAccess.findFirst({
      where: {
        id: promoAccessId,
        userId,
        status:
          PromoAccessStatus.ACTIVE,
      },
    });

  if (
    !access ||
    isPromoAccessExpired(
      access.expiresAt
    )
  ) {
    return null;
  }

  return access;
}

export function getPromoAccessUrl(
  origin: string,
  token: string
) {
  return `${origin.replace(
    /\/+$/,
    ""
  )}/access/${encodeURIComponent(token)}`;
}
