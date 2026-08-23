[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
function Post($json) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000/api/data" -Method POST -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) -UseBasicParsing
    return [System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
      return "ERR: " + $reader.ReadToEnd()
    }
    return "ERR: " + $_.Exception.Message
  }
}
$created = Post '{"action":"createReminder","payload":{"title":"状态测试","content":"x","remindAt":"2099-01-01T01:00:00.000Z"}}'
Write-Output "created: $created"
$obj = $created | ConvertFrom-Json
$upd = Post ('{"action":"updateReminderStatus","payload":{"id":"' + $obj.id + '","status":"done"}}')
Write-Output "update: $upd"
$list = Post '{"action":"getReminders","payload":null}'
Write-Output "list: $list"
