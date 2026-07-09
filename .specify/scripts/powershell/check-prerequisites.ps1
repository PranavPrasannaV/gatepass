param(
    [switch]$Json,
    [switch]$RequireTasks,
    [switch]$IncludeTasks,
    [switch]$PathsOnly
)
. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-RepoRoot
$featureDir = Get-FeatureDir -Root $root
if (-not $featureDir) {
    Write-Error "No feature found. Run /speckit-specify first."
    exit 1
}
if ($RequireTasks -and -not (Test-Path (Join-Path $featureDir "tasks.md"))) {
    Write-Error "tasks.md missing. Run /speckit-tasks first."
    exit 1
}

$result = [ordered]@{
    FEATURE_DIR    = $featureDir
    AVAILABLE_DOCS = @(Get-AvailableDocs -FeatureDir $featureDir)
}
if ($IncludeTasks) { $result["TASKS"] = (Join-Path $featureDir "tasks.md") }

$result | ConvertTo-Json -Depth 5
