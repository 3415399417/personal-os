$body = '{"action":"getDashboard","payload":null}'
$r = Invoke-WebRequest -Uri "http://localhost:3000/api/data" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
$r.Content
