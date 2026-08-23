[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = '{"action":"createReminder","payload":{"title":"API测试提醒","content":"系统提醒","remindAt":"2099-01-01T01:00:00.000Z"}}'
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/api/data" -Method POST -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
  [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
} catch {
  $resp = $_.Exception.Response
  if ($resp) {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $reader.ReadToEnd()
  } else {
    $_.Exception.Message
  }
}
