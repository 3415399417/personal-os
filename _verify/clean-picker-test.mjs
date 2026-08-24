const taskId = "cmt5oq7p2000l0ouvyq0ojtcv"; // 完善文档并部署交付
const resp = await fetch("http://localhost:3000/api/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    action: "updateTaskArtifacts",
    payload: {
      taskId,
      artifacts: [
        { type: "file", path: "README.md" },
        { type: "folder", path: "dist/" },
      ],
    },
  }),
});
const d = await resp.json();
console.log("restored:", d ? d.text : "FAIL", resp.status);
const status = await (await fetch("http://localhost:3000/api/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "getTaskArtifactStatus", payload: { taskId } }),
})).json();
console.log("status:", JSON.stringify(status.artifacts));
