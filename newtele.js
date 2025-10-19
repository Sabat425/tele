(function () {
  const logger = {
    info: (message, fileName = null) => console.log(`[Tel Download] ${fileName ? `${fileName}: ` : ""}${message}`),
    error: (message, fileName = null) => console.error(`[Tel Download] ${fileName ? `${fileName}: ` : ""}${message}`),
  };

  // Icons and constants
  const DOWNLOAD_ICON = "\uE95F";
  const contentRangeRegex = /^bytes (\d+)-(\d+)\/(\d+)$/;
  const REFRESH_DELAY = 500;
  const hashCode = (s) => {
    let h = 0, l = s.length, i = 0;
    if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
    return h >>> 0;
  };

  let isInitialized = false;

  // Progress bar functions
  const safeQuery = (selector) => typeof document !== 'undefined' ? document.querySelector(selector) : null;
  const safeQueryAll = (selector) => typeof document !== 'undefined' ? document.querySelectorAll(selector) : [];
  const safeCreateElement = (tag) => typeof document !== 'undefined' ? document.createElement(tag) : null;

  const createProgressBar = (videoId, fileName) => {
    try {
      if (typeof document === 'undefined' || !document.body) return;
      const isDarkMode = safeQuery("html")?.classList?.contains("night") || safeQuery("html")?.classList?.contains("theme-dark") || false;
      const container = safeQuery("#tel-downloader-progress-bar-container");
      if (!container) return;
      const innerContainer = safeCreateElement("div");
      if (!innerContainer) return;
      innerContainer.id = "tel-downloader-progress-" + videoId;
      innerContainer.style.cssText = `
        width: 20rem; margin-top: 0.4rem; padding: 0.6rem;
        background-color: ${isDarkMode ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.6)"};
      `;

      const flexContainer = safeCreateElement("div");
      if (!flexContainer) return;
      flexContainer.style.cssText = "display: flex; justify-content: space-between;";

      const title = safeCreateElement("p");
      if (!title) return;
      title.className = "filename";
      title.style.cssText = "margin: 0; color: white;";
      title.innerText = fileName;

      const closeButton = safeCreateElement("div");
      if (!closeButton) return;
      closeButton.style.cssText = "cursor: pointer; font-size: 1.2rem; color: " + (isDarkMode ? "#8a8a8a" : "white") + ";";
      closeButton.innerHTML = "&times;";
      closeButton.onclick = () => {
        if (container && innerContainer) container.removeChild(innerContainer);
      };

      const progressBar = safeCreateElement("div");
      if (!progressBar) return;
      progressBar.className = "progress";
      progressBar.style.cssText = `
        background-color: #e2e2e2; position: relative; width: 100%; height: 1.6rem;
        border-radius: 2rem; overflow: hidden;
      `;

      const counter = safeCreateElement("p");
      if (!counter) return;
      counter.style.cssText = `
        position: absolute; z-index: 5; left: 50%; top: 50%; transform: translate(-50%, -50%);
        margin: 0; color: black;
      `;
      const progress = safeCreateElement("div");
      if (!progress) return;
      progress.style.cssText = "position: absolute; height: 100%; width: 0%; background-color: #6093B5;";

      progressBar.append(counter, progress);
      flexContainer.append(title, closeButton);
      innerContainer.append(flexContainer, progressBar);
      container.appendChild(innerContainer);
    } catch (e) {
      logger.error("Error creating progress bar: " + e.message);
    }
  };

  const updateProgress = (videoId, fileName, progress) => {
    try {
      if (typeof document === 'undefined') return;
      const inner = safeQuery("#tel-downloader-progress-" + videoId);
      if (!inner) return;
      inner.querySelector("p.filename").innerText = fileName;
      const progressBar = inner.querySelector("div.progress");
      if (!progressBar) return;
      progressBar.querySelector("p").innerText = progress + "%";
      progressBar.querySelector("div").style.width = progress + "%";
    } catch (e) {
      logger.error("Error updating progress: " + e.message);
    }
  };

  const completeProgress = (videoId) => {
    try {
      if (typeof document === 'undefined') return;
      const progressContainer = safeQuery("#tel-downloader-progress-" + videoId);
      if (!progressContainer) return;
      const progressBar = progressContainer.querySelector("div.progress");
      if (!progressBar) return;
      progressBar.querySelector("p").innerText = "Completed";
      progressBar.querySelector("div").style.cssText = "background-color: #B6C649; width: 100%;";
      setTimeout(() => {
        const container = safeQuery("#tel-downloader-progress-bar-container");
        const element = safeQuery("#tel-downloader-progress-" + videoId);
        if (container && element) container.removeChild(element);
      }, 4000);
    } catch (e) {
      logger.error("Error completing progress: " + e.message);
    }
  };

  const abortProgress = (videoId) => {
    try {
      if (typeof document === 'undefined') return;
      const progressContainer = safeQuery("#tel-downloader-progress-" + videoId);
      if (!progressContainer) return;
      const progressBar = progressContainer.querySelector("div.progress");
      if (!progressBar) return;
      progressBar.querySelector("p").innerText = "Aborted";
      progressBar.querySelector("div").style.cssText = "background-color: #D16666; width: 100%;";
    } catch (e) {
      logger.error("Error aborting progress: " + e.message);
    }
  };

  // Video download from original, adapted
  const tel_download_video = (url) => {
    if (!url) return;
    let _blobs = [];
    let _next_offset = 0;
    let _total_size = null;
    let _file_extension = "mp4";
    const videoId = (Math.random() + 1).toString(36).substring(2, 10) + "_" + Date.now().toString();
    let h = hashCode(url);
    if (h === 0) h = Date.now();
    let fileName = h.toString(36) + "." + _file_extension;

    // Extract filename from metadata if possible
    try {
      const metadata = JSON.parse(decodeURIComponent(url.split("/").pop()));
      if (metadata.fileName) fileName = metadata.fileName;
    } catch {}

    logger.info(`Starting video download: ${url.substring(0, 50)}...`, fileName);

    const fetchNextPart = (writable = null) => {
      const headers = { Range: `bytes=${_next_offset}-` };
      fetch(url, { method: "GET", headers }).then(res => {
        if (![200, 206].includes(res.status)) throw new Error(`Status: ${res.status}`);
        const mime = res.headers.get("Content-Type")?.split(";")[0] || "";
        if (!mime.startsWith("video/")) throw new Error(`MIME: ${mime}`);
        _file_extension = mime.split("/")[1] || "mp4";
        fileName = fileName.replace(/\.[^.]+$/, `.${_file_extension}`);

        let startOffset, endOffset, totalSize;
        if (res.status === 206) {
          const contentRange = res.headers.get("Content-Range");
          if (!contentRange) throw new Error("No Content-Range");
          const match = contentRange.match(contentRangeRegex);
          if (!match) throw new Error("Invalid Content-Range");
          [_, startOffset, endOffset, totalSize] = match.map(Number);
          if (startOffset !== _next_offset) throw new Error("Offset gap");
          if (_total_size && totalSize !== _total_size) throw new Error("Size mismatch");
          _total_size = totalSize;
        } else if (res.status === 200) {
          // Full fallback
          logger.info("Full download fallback", fileName);
          return res.blob().then(blob => {
            _blobs = [blob];
            _total_size = blob.size;
            _next_offset = _total_size;
            updateProgress(videoId, fileName, 100);
            if (writable) writable.write(blob).then(() => writable.close());
            else save();
            completeProgress(videoId);
          });
        }

        _next_offset = endOffset + 1;
        const pct = ((_next_offset * 100) / _total_size).toFixed(0);
        updateProgress(videoId, fileName, pct);
        return res.blob();
      }).then(blob => {
        if (writable) writable.write(blob);
        else _blobs.push(blob);
        if (_next_offset < _total_size) fetchNextPart(writable);
        else if (writable) writable.close().then(() => logger.info("FSA finished", fileName));
        else save();
      }).catch(err => {
        logger.error(err, fileName);
        abortProgress(videoId);
      });
    };

    const save = () => {
      try {
        if (!_blobs.length || !_blobs[0].size) {
          logger.error("No data to save", fileName);
          abortProgress(videoId);
          return;
        }
        const blob = new Blob(_blobs, { type: `video/${_file_extension}` });
        const blobUrl = URL.createObjectURL(blob);
        const a = safeCreateElement("a");
        if (!a) return;
        a.style.display = "none";
        document.body.appendChild(a);
        a.href = blobUrl;
        a.download = fileName;
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          setTimeout(() => {
            const event = document.createEvent('MouseEvents');
            event.initMouseEvent('click', true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
            a.dispatchEvent(event);
          }, 0);
        } else a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        logger.info(`Downloaded: ${blob.size} bytes`, fileName);
        completeProgress(videoId);
      } catch (e) {
        logger.error("Save error: " + e.message, fileName);
        abortProgress(videoId);
      }
    };

    createProgressBar(videoId, fileName);
    const supportsFSA = typeof window !== 'undefined' && "showSaveFilePicker" in window && window.self === window.top;
    if (supportsFSA) {
      window.showSaveFilePicker({ suggestedName: fileName }).then(handle => handle.createWritable().then(writable => fetchNextPart(writable))).catch(err => {
        if (err.name !== "AbortError") logger.error(err);
        else fetchNextPart();
      });
    } else {
      fetchNextPart();
    }
  };

  // Audio download from original, adapted
  const tel_download_audio = (url) => {
    if (!url) return;
    let _blobs = [];
    let _next_offset = 0;
    let _total_size = null;
    let h = hashCode(url);
    if (h === 0) h = Date.now();
    const fileName = h.toString(36) + ".ogg";

    const fetchNextPart = (writable = null) => {
      const headers = { Range: `bytes=${_next_offset}-` };
      fetch(url, { method: "GET", headers }).then(res => {
        if (![200, 206].includes(res.status)) throw new Error(`Status: ${res.status}`);
        const mime = res.headers.get("Content-Type")?.split(";")[0] || "";
        if (!mime.startsWith("audio/")) throw new Error(`MIME: ${mime}`);

        let startOffset, endOffset, totalSize;
        if (res.status === 206) {
          const contentRange = res.headers.get("Content-Range");
          if (!contentRange) throw new Error("No Content-Range");
          const match = contentRange.match(contentRangeRegex);
          if (!match) throw new Error("Invalid Content-Range");
          [_, startOffset, endOffset, totalSize] = match.map(Number);
          if (startOffset !== _next_offset) throw new Error("Offset gap");
          if (_total_size && totalSize !== _total_size) throw new Error("Size mismatch");
          _total_size = totalSize;
        } else if (res.status === 200) {
          return res.blob().then(blob => {
            _blobs = [blob];
            _total_size = blob.size;
            _next_offset = _total_size;
            if (writable) writable.write(blob).then(() => writable.close());
            else save();
          });
        }

        _next_offset = endOffset + 1;
        return res.blob();
      }).then(blob => {
        if (writable) writable.write(blob);
        else _blobs.push(blob);
        if (_next_offset < _total_size) fetchNextPart(writable);
        else if (writable) writable.close();
        else save();
      }).catch(err => logger.error(err, fileName));
    };

    const save = () => {
      try {
        if (!_blobs.length || !_blobs[0].size) {
          logger.error("No data to save", fileName);
          return;
        }
        const blob = new Blob(_blobs, { type: "audio/ogg" });
        const blobUrl = URL.createObjectURL(blob);
        const a = safeCreateElement("a");
        if (!a) return;
        a.style.display = "none";
        document.body.appendChild(a);
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        setTimeout(() => {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        logger.info(`Audio downloaded: ${blob.size} bytes`, fileName);
      } catch (e) {
        logger.error("Audio save error: " + e.message, fileName);
      }
    };

    const supportsFSA = typeof window !== 'undefined' && "showSaveFilePicker" in window && window.self === window.top;
    if (supportsFSA) {
      window.showSaveFilePicker({ suggestedName: fileName }).then(handle => handle.createWritable().then(writable => fetchNextPart(writable))).catch(err => {
        if (err.name !== "AbortError") logger.error(err);
        else fetchNextPart();
      });
    } else {
      fetchNextPart();
    }
  };

  const tel_download_image = (url) => {
    try {
      if (typeof document === 'undefined' || !document.body || !url) return;
      let h = hashCode(url);
      if (h === 0) h = Date.now();
      const fileName = h.toString(36) + ".jpeg";
      const a = safeCreateElement("a");
      if (!a) return;
      a.style.display = "none";
      document.body.appendChild(a);
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
      }, 100);
      logger.info("Image downloaded", fileName);
    } catch (e) {
      logger.error("Image download error: " + e.message);
    }
  };

  // Button creation
  const createDownloadButton = (mediaElement, src, isVideo = true) => {
    try {
      if (typeof document === 'undefined' || !mediaElement || !src) return null;
      if (mediaElement.querySelector('.tel-download-button-container')) return null;
      const buttonContainer = safeCreateElement('div');
      if (!buttonContainer) return null;
      buttonContainer.className = 'tel-download-button-container';
      buttonContainer.style.cssText = `
        position: absolute; top: 8px; right: 8px; z-index: 1000;
        width: 36px; height: 36px; pointer-events: auto;
      `;

      const downloadButton = safeCreateElement('button');
      if (!downloadButton) return null;
      downloadButton.className = 'btn-icon tgico-download tel-download';
      downloadButton.innerHTML = `<span class="tgico button-icon">${DOWNLOAD_ICON}</span>`;
      downloadButton.style.cssText = `
        background: rgba(0, 0, 0, 0.6); border: none; border-radius: 50%;
        width: 100%; height: 100%; cursor: pointer; color: white;
        display: flex; align-items: center; justify-content: center;
        backdrop-filter: blur(4px);
      `;

      downloadButton.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (isVideo || src.includes('document') || src.startsWith('https://web.telegram.org/a/progressive')) {
          tel_download_video(src);
        } else if (src.includes('audio')) {
          tel_download_audio(src);
        } else {
          tel_download_image(src);
        }
      };

      buttonContainer.appendChild(downloadButton);
      mediaElement.style.position = 'relative';
      mediaElement.appendChild(buttonContainer);
      return buttonContainer;
    } catch (e) {
      logger.error("Error creating button: " + e.message);
      return null;
    }
  };

  // Media detection
  const addDownloadButtonsToMedia = () => {
    try {
      if (typeof document === 'undefined' || !document.body) return;

      // Message list
      safeQueryAll('.Message .media-inner').forEach(container => {
        if (container.querySelector('.tel-download-button-container')) return;
        const video = container.querySelector('video');
        const img = container.querySelector('img.thumbnail, .media-inner img');
        if (video && video.src) createDownloadButton(container, video.src, true);
        else if (img && img.src) createDownloadButton(container, img.src, false);
      });

      // General videos
      safeQueryAll('video:not(.has-download-button)').forEach(video => {
        if (video.closest('.Message')) return;
        video.classList.add('has-download-button');
        const parent = video.parentElement || video;
        createDownloadButton(parent, video.src || video.currentSrc, true);
      });

      // Audios
      safeQueryAll('audio-element:not(.has-download-button), .pinned-audio audio').forEach(audioEl => {
        if (audioEl.classList.contains('has-download-button')) return;
        audioEl.classList.add('has-download-button');
        const src = audioEl.audio?.getAttribute('src') || audioEl.querySelector('audio')?.src;
        if (src) createDownloadButton(audioEl.closest('.bubble') || audioEl, src, false);
      });

      // Stories
      safeQueryAll('#StoryViewer, #stories-viewer').forEach(stories => {
        if (stories.querySelector('.tel-download')) return;
        const video = stories.querySelector('video');
        const img = stories.querySelector('img.media-photo, img.PVZ8TOWS');
        const target = stories.querySelector('.GrsJNw3y, [class*="ViewerStoryHeaderRight"], .DropdownMenu')?.parentNode ||
                       stories.querySelector('[class*="ViewerStoryFooterRight"]') ||
                       stories;
        if (video?.src) createDownloadButton(target, video.src, true);
        else if (img?.src) createDownloadButton(target, img.src, false);
      });

      // Media viewers
      safeQueryAll('#MediaViewer .MediaViewerSlide--active, .media-viewer-whole .media-viewer-aspecter').forEach(viewer => {
        if (viewer.querySelector('.tel-download')) return;
        const videoPlayer = viewer.querySelector('.VideoPlayer video, .ckin__player video, video');
        const imgEl = viewer.querySelector('.MediaViewerContent img, img.thumbnail');
        const target = viewer.querySelector('.MediaViewerActions, .media-viewer-topbar .media-viewer-buttons, .VideoPlayerControls .buttons') || viewer;
        if (videoPlayer?.src) createDownloadButton(target, videoPlayer.src || videoPlayer.currentSrc, true);
        else if (imgEl?.src) createDownloadButton(target, imgEl.src, false);
      });
    } catch (e) {
      logger.error('Detection error: ' + e.message);
    }
  };

  // Init
  const init = () => {
    try {
      if (typeof document === 'undefined' || !document.body) {
        setTimeout(init, 100);
        return;
      }
      if (isInitialized) return;
      isInitialized = true;

      const container = safeCreateElement("div");
      if (!container) return;
      container.id = "tel-downloader-progress-bar-container";
      container.style.cssText = `position: fixed; bottom: 0; right: 0; z-index: ${location.pathname?.startsWith("/k/") ? 4 : 1600};`;
      document.body.appendChild(container);

      setInterval(addDownloadButtonsToMedia, REFRESH_DELAY);
      setTimeout(addDownloadButtonsToMedia, 100);

      logger.info("Fixed Telegram Downloader: Original logic + fixes (no 0.mp4, viewable videos).");
    } catch (e) {
      logger.error("Init error: " + e.message);
      setTimeout(init, 200);
    }
  };

  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    window.addEventListener('load', init);
  } else {
    setTimeout(init, 500);
  }
})();
