# Test OpenAI Service with proper timeout handling
# This script uses .NET WebClient with longer timeouts

$ErrorActionPreference = "Stop"

# Load environment variables
$envFile = ".\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Loaded environment variables" -ForegroundColor Green
}

Write-Host "Testing OpenAI Service with 60-second timeout..." -ForegroundColor Cyan

# Test data
$testBody = @{
    text = "Hello, how are you?"
    targetLanguage = "spanish"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "User-Agent" = "PowerShell-Test/1.0"
}

# Create WebClient with custom timeout
Add-Type -AssemblyName System.Net.Http

$httpClient = New-Object System.Net.Http.HttpClient
$httpClient.Timeout = [TimeSpan]::FromSeconds(60)

$content = New-Object System.Net.Http.StringContent($testBody, [System.Text.Encoding]::UTF8, "application/json")

Write-Host "Sending POST request to /api/ai/translate..." -ForegroundColor Yellow
Write-Host "Body: $testBody" -ForegroundColor Gray

try {
    $response = $httpClient.PostAsync("http://localhost:5000/api/ai/translate", $content).Result
    $responseContent = $response.Content.ReadAsStringAsync().Result
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $responseContent" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.InnerException) {
        Write-Host "Inner Exception: $($_.Exception.InnerException.Message)" -ForegroundColor Red
    }
} finally {
    $httpClient.Dispose()
    if ($content) { $content.Dispose() }
}

Write-Host "`nTest completed." -ForegroundColor Cyan
