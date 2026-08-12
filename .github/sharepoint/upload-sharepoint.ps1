<#
.SYNOPSIS
    Uploads a file to a SharePoint document library using Azure AD app-only auth + Microsoft Graph.
    Replaces the retired ACS-based app-only auth model.

.NOTES
    - Requires the app registration to have Microsoft Graph "Sites.ReadWrite.All"
      (or "Sites.Selected" scoped to this site) as an Application permission,
      with admin consent granted in Azure Portal.
    - Store $clientSecret in Azure Key Vault / 1Password in production —
      do not leave it hardcoded in a script that gets committed or shared.
#>

# ===================== CONFIG =====================
$tenantId      = $env:AZURE_TENANT_ID              # Directory (tenant) ID from Azure AD app Overview
$clientId      = $env:AZURE_CLIENT_ID          # Application (client) ID from Azure AD app Overview
$clientSecret  = $env:AZURE_CLIENT_SECRET   # Value column from Certificates & secrets (NOT Secret ID)

$siteHostname  = $env:SP_SITE_HOST_NAME
$sitePath      = $env:SP_SITE_PATH
$targetFolder  = $env:SP_TARGET_FOLDER                        # Document library folder to upload into
$filePath      = $env:SP_FILE_PATH
$fileName      = $env:SP_FILE_NAME
# ===================================================

$ErrorActionPreference = "Stop"

function Get-GraphAccessToken {
    param($TenantId, $ClientId, $ClientSecret)

    $tokenUrl = "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token"
    $body = @{
        grant_type    = "client_credentials"
        client_id     = $ClientId
        client_secret = $ClientSecret
        scope         = "https://graph.microsoft.com/.default"
    }

    try {
        $response = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
        return $response.access_token
    } catch {
        $errDetail = $_.ErrorDetails.Message
        Write-Error "Failed to acquire access token. Check tenantId/clientId/clientSecret and that admin consent was granted. Details: $errDetail"
        throw
    }
}

function Get-SharePointSiteId {
    param($AccessToken, $Hostname, $SitePath)

    $uri = "https://graph.microsoft.com/v1.0/sites/${Hostname}:${SitePath}"
    $headers = @{ Authorization = "Bearer $AccessToken" }

    try {
        $site = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
        return $site.id
    } catch {
        $errDetail = $_.ErrorDetails.Message
        Write-Error "Failed to resolve site ID for '$Hostname$SitePath'. Check the site URL and that the app has Sites.Read.All or greater. Details: $errDetail"
        throw
    }
}

function Upload-FileToSharePoint {
    param($AccessToken, $SiteId, $Folder, $LocalFilePath, $RemoteFileName)

    $uploadUrl = "https://graph.microsoft.com/v1.0/sites/$SiteId/drive/root:/${Folder}/${RemoteFileName}:/content"
    $headers = @{ Authorization = "Bearer $AccessToken" }

    if (-not (Test-Path $LocalFilePath)) {
        Write-Error "Local file not found: $LocalFilePath"
        throw "FileNotFound"
    }

    try {
        $response = Invoke-RestMethod -Uri $uploadUrl -Method Put -Headers $headers -InFile $LocalFilePath -ContentType "application/octet-stream"
        return $response
    } catch {
        $errDetail = $_.ErrorDetails.Message
        Write-Error "Upload failed. Check that the app has Sites.ReadWrite.All (or Sites.Selected access to this site) and that the folder '$Folder' exists. Details: $errDetail"
        throw
    }
}

# ===================== EXECUTION =====================

Write-Host "Step 1: Acquiring access token..."
$accessToken = Get-GraphAccessToken -TenantId $tenantId -ClientId $clientId -ClientSecret $clientSecret
Write-Host "  Token acquired."

Write-Host "Step 2: Resolving SharePoint site ID..."
$siteId = Get-SharePointSiteId -AccessToken $accessToken -Hostname $siteHostname -SitePath $sitePath
Write-Host "  Site ID: $siteId"

Write-Host "Step 3: Uploading file..."
$uploadResponse = Upload-FileToSharePoint -AccessToken $accessToken -SiteId $siteId -Folder $targetFolder -LocalFilePath $filePath -RemoteFileName $fileName
Write-Host "  Upload call completed."

# ===================== VERIFY =====================

$uploadedName = $uploadResponse.name
$lastModifiedRaw = $uploadResponse.lastModifiedDateTime   # ISO 8601, e.g. 2026-07-14T10:23:45Z
$webUrl = $uploadResponse.webUrl

Write-Host "`nRaw upload response:"
$uploadResponse | ConvertTo-Json -Depth 5

$parsedTime = [datetime]::MinValue
$parsed = [datetime]::TryParse(
    $lastModifiedRaw,
    [Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal,
    [ref]$parsedTime
)

if ($parsed) {
    $timeDifference = (Get-Date).ToUniversalTime() - $parsedTime.ToUniversalTime()
} else {
    Write-Warning "Could not parse lastModifiedDateTime value: '$lastModifiedRaw'"
    $timeDifference = [TimeSpan]::MaxValue
}

if ($fileName -eq $uploadedName -and $timeDifference.TotalMinutes -le 1) {
    Write-Host "`nSUCCESS: File uploaded."
    Write-Host "File URL: $webUrl"
} else {
    Write-Host "`nWARNING: Upload verification failed (name or timestamp mismatch)."
    Write-Host "Expected file name: $fileName | Returned: $uploadedName"
}