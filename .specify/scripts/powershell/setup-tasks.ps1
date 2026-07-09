param([switch]$Json)
. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-RepoRoot
$featureDir = Get-FeatureDir -Root $root

[ordered]@{
    FEATURE_DIR    = $featureDir
    TASKS_TEMPLATE = (Join-Path $root ".specify/templates/tasks-template.md")
    AVAILABLE_DOCS = @(Get-AvailableDocs -FeatureDir $featureDir)
} | ConvertTo-Json -Depth 5
