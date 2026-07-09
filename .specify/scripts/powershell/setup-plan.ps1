param([switch]$Json)
. (Join-Path $PSScriptRoot "common.ps1")

$root = Get-RepoRoot
$featureDir = Get-FeatureDir -Root $root

[ordered]@{
    FEATURE_SPEC = (Join-Path $featureDir "spec.md")
    IMPL_PLAN    = (Join-Path $featureDir "plan.md")
    SPECS_DIR    = $featureDir
    BRANCH       = (Split-Path $featureDir -Leaf)
} | ConvertTo-Json -Depth 5
