param(
  [string]$OutputPath = "src-tauri/icons/app-icon.png"
)

Add-Type -AssemblyName System.Drawing

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $diameter = $Radius * 2
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

$size = 1024
$bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.Clear([System.Drawing.Color]::Transparent)

$iconPath = New-RoundedRectanglePath 64 64 896 896 214
$bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.RectangleF]::new(64, 64, 896, 896),
  [System.Drawing.ColorTranslator]::FromHtml("#172B4D"),
  [System.Drawing.ColorTranslator]::FromHtml("#0C1A30"),
  [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$graphics.FillPath($bgBrush, $iconPath)

$highlightPath = New-RoundedRectanglePath 108 106 808 416 184
$highlightBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
  [System.Drawing.RectangleF]::new(108, 106, 808, 416),
  [System.Drawing.Color]::FromArgb(38, 255, 255, 255),
  [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
  [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$graphics.FillPath($highlightBrush, $highlightPath)

$edgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(34, 255, 255, 255), 3)
$graphics.DrawPath($edgePen, $iconPath)

$paperPath = New-RoundedRectanglePath 304 310 416 450 88
$paperBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(20, 255, 255, 255))
$graphics.FillPath($paperBrush, $paperPath)

$glyphPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 48)
$glyphPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$glyphPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$glyphPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$bodyPath = New-RoundedRectanglePath 296 432 432 296 58
$graphics.DrawPath($glyphPen, $bodyPath)

$shacklePath = [System.Drawing.Drawing2D.GraphicsPath]::new()
$shacklePath.AddArc(354, 276, 316, 290, 202, 136)
$graphics.DrawPath($glyphPen, $shacklePath)

$detailPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(218, 255, 255, 255), 34)
$detailPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$detailPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$graphics.DrawLine($detailPen, 392, 538, 632, 538)
$graphics.DrawLine($detailPen, 392, 624, 570, 624)

$dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#D9A441"))
$graphics.FillEllipse($dotBrush, 640, 632, 50, 50)

$outDir = Split-Path -Parent $OutputPath
if ($outDir -and !(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$bitmap.Save((Resolve-Path -LiteralPath $outDir).Path + "\" + (Split-Path -Leaf $OutputPath), [System.Drawing.Imaging.ImageFormat]::Png)

$edgePen.Dispose()
$dotBrush.Dispose()
$detailPen.Dispose()
$glyphPen.Dispose()
$paperBrush.Dispose()
$highlightBrush.Dispose()
$bgBrush.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
