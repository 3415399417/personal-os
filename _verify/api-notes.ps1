[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$body = '{"action":"getNotes","payload":null}'
$r = Invoke-WebRequest -Uri "http://localhost:3000/api/data" -Method POST -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing
[System.Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray())
