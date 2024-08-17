const { ethers } = require("ethers");

let tasks = [];

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollup_server);

// Convert hex to string
function hex2str(hex) {
  return ethers.toUtf8String(hex);
}

// Convert string to hex
function str2hex(str) {
  return ethers.hexlify(ethers.toUtf8Bytes(str));
}

// Add a task to the to-do list
function addTask(task) {
  tasks.push(task);
  console.log(`Task added: ${task}`);
}

// Handle the addition of tasks (equivalent to posting tasks)
async function handle_advance(data) {
  console.log("Received advance request data " + JSON.stringify(data));

  const payload = data["payload"];
  const task = hex2str(payload);

  addTask(task); // Add the task

  const notice_req = await fetch(rollup_server + "/notice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(`Task added: ${task}`) }),
  });

  return "accept";
}

// Handle the retrieval of tasks (similar to inspect_state)
async function handle_inspect(data) {
  console.log("Received inspect request data " + JSON.stringify(data));

  const payload = data["payload"];
  const command = hex2str(payload);

  let responseObject;
  if (command === "list") {
    responseObject = JSON.stringify({ tasks });
  } else {
    responseObject = "command not recognized";
  }

  const report_req = await fetch(rollup_server + "/report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: str2hex(responseObject) }),
  });

  return "accept";
}

var handlers = {
  advance_state: handle_advance,
  inspect_state: handle_inspect,
};

var finish = { status: "accept" };

(async () => {
  while (true) {
    const finish_req = await fetch(rollup_server + "/finish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "accept" }),
    });

    console.log("Received finish status " + finish_req.status);

    if (finish_req.status == 202) {
      console.log("No pending rollup request, trying again");
    } else {
      const rollup_req = await finish_req.json();
      var handler = handlers[rollup_req["request_type"]];
      finish["status"] = await handler(rollup_req["data"]);
    }
  }
})();
