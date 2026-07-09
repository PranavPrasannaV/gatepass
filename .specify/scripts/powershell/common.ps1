# Shared helpers for the spec-kit shim scripts.
# This project was bootstrapped without the `specify` CLI, so these lightweight scripts
# provide the JSON the /speckit-* skills expect. They resolve the active feature from
# .specify/feature.json (falling back to the newest specs/* directory).

function Get-RepoRoot {
    # Script lives at .specify/scripts/powershell/, so repo root is three levels up.
    return (Get-Item $PSScriptRoot).Parent.Parent.Parent.FullName
}

function Get-FeatureDir {
    param([string]$Root)
    $featureJson = Join-Path $Root ".specify/feature.json"
    if (Test-Path $featureJson) {
        $data = Get-Content $featureJson -Raw | ConvertFrom-Json
        if ($data.feature_directory) {
            return (Join-Path $Root $data.feature_directory)
        }
    }
    # Fallback: newest directory under specs/
    $specs = Join-Path $Root "specs"
    if (Test-Path $specs) {
        $newest = Get-ChildItem $specs -Directory | Sort-Object Name | Select-Object -Last 1
        if ($newest) { return $newest.FullName }
    }
    return $null
}

function Get-AvailableDocs {
    param([string]$FeatureDir)
    $docs = @()
    foreach ($f in @("spec.md", "plan.md", "tasks.md", "research.md", "data-model.md", "quickstart.md")) {
        if (Test-Path (Join-Path $FeatureDir $f)) { $docs += $f }
    }
    if (Test-Path (Join-Path $FeatureDir "contracts")) { $docs += "contracts/" }
    return $docs
}
