import FFmpeg from "../static/ffmpeg.min";

const { createFFmpeg , fetchFile } = FFmpeg;

const ffmpeg = createFFmpeg({
    corePath: 'https://cdn.bootcdn.net/ajax/libs/ffmpeg-core/0.11.0/ffmpeg-core.js',
    log: true,
});

document.addEventListener('drop', function (e) {
    e.preventDefault()
}, false);

document.addEventListener('dragover', function (e) {
    e.preventDefault()
}, false)

// if(!crossOriginIsolated) {
//     window.SharedArrayBuffer = window.ArrayBuffer;
// }

const uploadButton = document.querySelector('#upload');
uploadButton.addEventListener('click', handleUpload, false);
const dropBox = document.querySelector('#drop-box');
dropBox.addEventListener('dragenter', handleDragEvent, false);
dropBox.addEventListener('dragleave', handleDragEvent, false);
dropBox.addEventListener('drop', handleDragEvent, false);

const musicName = document.querySelector('#music-name');
const musicSize = document.querySelector('#music-size');
const musicType = document.querySelector('#music-type');
const audio = document.querySelector('#audio');

const recordButton = document.querySelector('#record');
recordButton.addEventListener('click', handleRecord);

const canvas = document.querySelector('#canvas');
canvas.width = 800;
canvas.height = 400;

const processDom = document.querySelector('#process');

let audioFile = null;
let isRecording = false;

function handleDragEvent(event) {
    if(event.type === 'dragenter') {
        event.preventDefault();
        event.stopPropagation();
        dropBox.style.borderStyle = 'dashed';
    } else if(event.type === 'dragleave') {
        event.preventDefault();
        event.stopPropagation();
        dropBox.style.borderStyle = 'solid';
    } else if(event.type === 'drop') {
        dropBox.style.borderStyle = 'solid';
        const file = event.dataTransfer.files[0];
        if(file instanceof File) {
            if(file.type.includes('audio')) {
                audioFile = file;
                musicName.innerText = file.name;
                musicSize.innerText = Number(file.size / 1024).toFixed(2) + ' KB';
                musicType.innerText = file.type;

                audio.src = URL.createObjectURL(file);
            } else {
                alert('请上传音频文件')
            }
        }
    }
}

function handleUpload() {
    let input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', '.mp3,.ogg');
    input.onchange = () => {
        const file = input.files[0];
        audioFile = file;
        musicName.innerText = file.name;
        musicSize.innerText = Number(file.size / 1024).toFixed(2) + ' KB';
        musicType.innerText = file.type;

        audio.src = URL.createObjectURL(file);
        input = null;
    }
    input.click();

}

function handleRecord() {
    if(!audio.src) {
        alert('请先上传音乐文件')
        return;
    }

    if(isRecording) {
        return;
    }

    // 播放
    draw();
    record()
    audio.play();
}

function setRecording(flag) {
    isRecording = flag;
    changeButton();
}

function record() {
    setRecording(true);
    const stream = canvas.captureStream();
    const recorder = new window.MediaRecorder(stream, { mimeType: 'video/webm' });
    
    const data = [];
    recorder.ondataavailable = function (event) {
        if(event.data && event.data.size) {
            data.push(event.data);
        }
    }
    
    recorder.onstop = async function () {
       setRecording(false);
        const video = document.querySelector("#video");
        video.src = URL.createObjectURL(new Blob(data, { type: 'video/mp4' }));
        video.play();
        return;
        // FIXME: SharedArrayBuffer需要跨域，目前有问题
        // const videoName = audioFile.name.replace('mp3', 'mp4');
        // const videoFile = new File(data, videoName,{ type: 'video/webm' });
        // await ffmpeg.load();
        //
        // const videoInputFile = await fetchFile(videoFile);
        //
        // ffmpeg.FS('writeFile', videoName, videoInputFile);
        // ffmpeg.FS('writeFile', audioFile.name, await fetchFile(audioFile));
        //
        // await ffmpeg.run('-i', videoName, '-i', audioFile.name, '-c:v', 'copy', '-c:a', 'acc', '-strict', 'experimental', '-map', '0:v:0', '-map', '1:a:0', 'output.mp4');
        // const outputData = ffmpeg.FS('readFile', 'output.mp4');
        // video.src = URL.createObjectURL(new Blob(outputData.buffer, { type: 'video/mp4' }));
    }

    audio.onended = function () {
        recorder.stop();
    }

    recorder.start();
}

function draw() {
    const audioCtx = new window.AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    // 通过<audio>节点创建音频源
    const source = audioCtx.createMediaElementSource(audio);

    // 将音频源关联到分析器
    source.connect(analyser);

    // 将分析器关联到输出设备（耳机、扬声器）
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const ctx = canvas.getContext('2d');
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const barWidth = WIDTH / bufferLength * 1.5;
    let barHeight;

    function renderFrame() {
        requestAnimationFrame(renderFrame);

        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        for (let i = 0, x = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];

            const r = barHeight + 25 * (i / bufferLength);
            const g = 250 * (i / bufferLength);
            const b = 50;

            ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

            x += barWidth + 2;
        }

        drawProcess()
    }

    renderFrame();
}

function drawProcess() {
    const process = audio.currentTime;
    const duration = audio.duration;
    processDom.innerText = `${process.toFixed(2)}/${duration.toFixed(2)}`;
}

function changeButton() {
    if(isRecording) {
        uploadButton.classList.add('active');
        recordButton.classList.add('active');

        uploadButton.children[0].innerText = '录制中...';
        recordButton.children[0].innerText = '录制中...';
    } else {
        uploadButton.classList.remove('active');
        recordButton.classList.remove('active');

        uploadButton.children[0].innerText = '上传';
        recordButton.children[0].innerText = '录制';
    }
}