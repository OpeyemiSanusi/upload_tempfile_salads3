let recorder, audioChunks = [];
let isRecording = false;
const recordButton = document.getElementById("recordButton");
const logDiv = document.getElementById("log");

recordButton.addEventListener("click", async () => {
    if (!isRecording) {
        log("Starting recording...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);

        recorder.ondataavailable = event => audioChunks.push(event.data);
        recorder.onstop = sendAudio;

        recorder.start();
        recordButton.textContent = "Stop Recording";
    } else {
        log("Stopping recording...");
        recorder.stop();
        recordButton.textContent = "Start Recording";
    }
    isRecording = !isRecording;
});

async function sendAudio() {
    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
    const fileName = `recording_${Date.now()}.webm`;

    const form = new FormData();
    form.append("mimeType", "audio/mpeg");
    form.append("file", audioBlob, fileName);
    form.append("sign", "true");
    form.append("signatureExp", "1800");

    log("Uploading...");

    try {
        const response = await fetchWithCORS(`https://storage-api.salad.com/organizations/editslab/files/${fileName}`, {
            method: "PUT",
            headers: {
                "Salad-Api-Key": "salad_cloud_user_" //REMEMBER TO INSERT THE REST OF YOUR API KEY HERE
            },
            body: form
        });

        const result = await response.json();
        log(`Upload complete: <a href="${result.url}" target="_blank">Download</a>`);
    } catch (error) {
        log("Upload failed: " + error.message);
    }
}

async function fetchWithCORS(url, options) {
    return new Promise((resolve, reject) => {
        chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [
                {
                    id: 1,
                    priority: 1,
                    action: { type: "modifyHeaders", responseHeaders: [{ header: "Access-Control-Allow-Origin", operation: "set", value: "*" }] },
                    condition: { urlFilter: "https://storage-api.salad.com/*", resourceTypes: ["xmlhttprequest"] }
                }
            ],
            removeRuleIds: [1]
        }, () => {
            fetch(url, options)
                .then(resolve)
                .catch(reject);
        });
    });
}

function log(message) {
    const time = new Date().toLocaleTimeString();
    logDiv.innerHTML += `<p>[${time}] ${message}</p>`;
}
