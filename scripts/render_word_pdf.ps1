param(
    [Parameter(Mandatory=$true)][string]$InputDir,
    [Parameter(Mandatory=$true)][string]$OutputDir,
    [string]$Only = ''
)

$ErrorActionPreference = 'Stop'
$inputRoot = (Resolve-Path -LiteralPath $InputDir).Path
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$outputRoot = (Resolve-Path -LiteralPath $OutputDir).Path
$word = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $files = @(Get-ChildItem -LiteralPath $inputRoot -File -Filter '*.docx' | Sort-Object Name)
    if ($Only) { $files = @($files | Where-Object Name -EQ $Only) }
    foreach ($file in $files) {
        $doc = $null
        try {
            $doc = $word.Documents.Open($file.FullName, $false, $true)
            $pdf = Join-Path $outputRoot ($file.BaseName + '.pdf')
            $doc.ExportAsFixedFormat($pdf, 17)
            Write-Output "$($file.Name) $($doc.ComputeStatistics(2)) pages"
        }
        finally {
            if ($doc -ne $null) { $doc.Close($false) }
        }
    }
}
finally {
    if ($word -ne $null) { $word.Quit() }
}
