# Test suite to verify all workspace skills adhere to Antigravity specification

$ErrorActionPreference = "Stop"
$skillsDir = Join-Path $PSScriptRoot "..\.agents\skills"

if (-not (Test-Path $skillsDir)) {
    Write-Error "FAIL: Directory .agents/skills does not exist at $skillsDir"
    exit 1
}

$skillDirs = Get-ChildItem -Path $skillsDir -Directory
if ($skillDirs.Count -eq 0) {
    Write-Error "FAIL: No skills found in $skillsDir"
    exit 1
}

Write-Host "Discovered $($skillDirs.Count) skills in .agents/skills"
$failedCount = 0

foreach ($dir in $skillDirs) {
    $skillName = $dir.Name
    $skillFile = Join-Path $dir.FullName "SKILL.md"

    if (-not (Test-Path $skillFile)) {
        Write-Host "[-] $($skillName): MISSING SKILL.md" -ForegroundColor Red
        $failedCount++
        continue
    }

    $content = Get-Content $skillFile -Raw -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Host "[-] $($skillName): SKILL.md is empty" -ForegroundColor Red
        $failedCount++
        continue
    }

    # Check YAML frontmatter
    if ($content -notmatch '(?s)^---\s*\r?\n(.*?)\r?\n---') {
        Write-Host "[-] $($skillName): Missing YAML frontmatter" -ForegroundColor Red
        $failedCount++
        continue
    }

    $frontmatter = $matches[1]

    # Check name field
    if ($frontmatter -notmatch '(?m)^name:\s*(.+)$') {
        Write-Host "[-] $($skillName): Missing 'name' in frontmatter" -ForegroundColor Red
        $failedCount++
        continue
    }

    # Check description field
    if ($frontmatter -notmatch '(?m)^description:\s*(.+)$') {
        Write-Host "[-] $($skillName): Missing 'description' in frontmatter" -ForegroundColor Red
        $failedCount++
        continue
    }

    Write-Host "[+] $($skillName): VALID" -ForegroundColor Green
}

if ($failedCount -gt 0) {
    Write-Error "Skill verification failed: $failedCount skill(s) invalid."
    exit 1
}

Write-Host "`nAll $($skillDirs.Count) skills passed verification successfully!" -ForegroundColor Cyan
