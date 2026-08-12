const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { MaskedSecret } = require('../maskedSecret.js');

let client;
let clientVaultUrl;
let hasLoggedMissingVaultConfiguration = false;

function buildVaultUrl() {
  const configuredUrl = process.env.KEY_VAULT_URL?.trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol !== "https:" || !url.hostname) {
        throw new Error("Key Vault URLs must use HTTPS and include a host.");
      }
      return url.toString().replace(/\/$/, "");
    } catch (error) {
      throw new Error("KEY_VAULT_URL must be a valid HTTPS URL.", { cause: error });
    }
  }

  const vaultName = process.env.KEY_VAULT_NAME?.trim();
  if (vaultName) {
    if (!/^[a-zA-Z0-9-]+$/.test(vaultName)) {
      throw new Error("KEY_VAULT_NAME may contain only letters, numbers, and hyphens.");
    }
    return `https://${vaultName}.vault.azure.net`;
  }

  if (!hasLoggedMissingVaultConfiguration) {
    console.log(
      "KEY_VAULT_URL or KEY_VAULT_NAME are not configured; using environment variables for secrets.",
    );
    hasLoggedMissingVaultConfiguration = true;
  }

  return undefined;
}

function getKeyVaultClient() {
  const vaultUrl = buildVaultUrl();
  if (!vaultUrl) {
    client = undefined;
    clientVaultUrl = undefined;
    return undefined;
  }

  if (vaultUrl && (!client || clientVaultUrl !== vaultUrl)) {
    client = new SecretClient(vaultUrl, new DefaultAzureCredential());
    clientVaultUrl = vaultUrl;
  }
  return client;
}

function getEnvironmentSecret(secretName) {
  const secret = process.env[secretName];
  if (secret === undefined) {
    throw new Error(`Environment variable missing: ${secretName}`);
  }
  return secret;
}

function validateSecretName(secretName) {
  if (typeof secretName !== "string" || !secretName.trim()) {
    throw new TypeError("secretName must be a non-empty string.");
  }
}

async function resolveSecret(secretName) {
  validateSecretName(secretName);

  const keyVaultClient = getKeyVaultClient();
  if (!keyVaultClient) {
    return getEnvironmentSecret(secretName);
  }

  try {
    const { value } = await keyVaultClient.getSecret(secretName);
    if (value === undefined) {
      throw new Error("The secret has no value.");
    }
    return value;
  } catch (error) {
    throw new Error(`Unable to retrieve secret '${secretName}' from Azure Key Vault.`, {
      cause: error,
    });
  }
}

// Returns a MaskedSecret handle, not the plaintext. console.log, template
// interpolation, and JSON.stringify on the result all redact automatically
// (see maskedSecret.js). There is no getter for the real value on this
// class, so there is no way to opt out of that from the caller's side.
async function getSecret(secretName) {
  return new MaskedSecret(await resolveSecret(secretName));
}

// Fetches the secret and fills it straight into the given Playwright locator.
// The value never leaves this call - it isn't logged, returned, or attached
// to any error thrown here.
async function fillSensitive(locator, secretName) {
  if (!locator || typeof locator.fill !== "function") {
    throw new TypeError("locator must be a Playwright Locator with a fill method.");
  }
  await locator.fill(await resolveSecret(secretName));
}

module.exports = { getSecret, fillSensitive };
