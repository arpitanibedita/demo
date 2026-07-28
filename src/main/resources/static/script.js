let allFiles = [];
let currentCategory = 'all';
let currentView = 'vault'; // 'vault', 'recent', 'starred', 'trash'

document.addEventListener("DOMContentLoaded", () => {
    loadFiles();
});

function loadFiles() {
    // Calling your Spring Boot endpoint
    fetch("/api/files/all")
    .then(response => response.json())
    .then(files => {
        allFiles = files.map(f => {
            const existing = allFiles.find(item => item.id === f.id);
            return {
                ...f,
                isStarred: existing ? existing.isStarred : false,
                isTrashed: existing ? existing.isTrashed : false
            };
        });
        renderFiles();
    })
    .catch(error => console.error("Error fetching files:", error));
}

function switchView(viewName, element) {
    currentView = viewName;

    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if (element) element.classList.add('active');

    const viewTitle = document.getElementById('viewTitle');
    if (viewName === 'vault') viewTitle.innerHTML = `<i class="fa-solid fa-hard-drive"></i> My Vault`;
    else if (viewName === 'recent') viewTitle.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Recent Assets`;
    else if (viewName === 'starred') viewTitle.innerHTML = `<i class="fa-solid fa-star"></i> Starred Assets`;
    else if (viewName === 'trash') viewTitle.innerHTML = `<i class="fa-solid fa-trash-can"></i> Trash Bin`;

    renderFiles();
}

function renderFiles() {
    const fileList = document.getElementById('fileList');
    const assetCountText = document.getElementById('assetCountText');
    const progressFill = document.getElementById('progressFill');
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();

    fileList.innerHTML = "";

    // 1. Sidebar View Filter
    let visibleFiles = allFiles.filter(file => {
        if (currentView === 'vault') return !file.isTrashed;
        if (currentView === 'recent') return !file.isTrashed;
        if (currentView === 'starred') return !file.isTrashed && file.isStarred;
        if (currentView === 'trash') return file.isTrashed;
        return true;
    });

    if (currentView === 'recent') {
        visibleFiles.sort((a, b) => b.id - a.id);
    }

    // 2. Search & Filter Chip
    visibleFiles = visibleFiles.filter(file => {
        const matchesSearch = file.fileName.toLowerCase().includes(searchQuery);
        const matchesCategory = filterByCategory(file, currentCategory);
        return matchesSearch && matchesCategory;
    });

    // Update Storage Bar
    const activeCount = allFiles.filter(f => !f.isTrashed).length;
    assetCountText.innerText = `${activeCount} Assets`;
    const usagePercent = Math.min((activeCount / 20) * 100, 100);
    progressFill.style.width = `${usagePercent}%`;

    if (visibleFiles.length === 0) {
        fileList.innerHTML = `<p style="color: #64748b; grid-column: 1/-1; text-align: center; padding: 40px;">No assets found in ${currentView}.</p>`;
        return;
    }

    visibleFiles.forEach(file => {
        const iconClass = getIconForType(file.fileType, file.fileName);
        const card = document.createElement('div');
        card.className = 'asset-card';

        if (currentView === 'trash') {
            card.innerHTML = `
                <div class="card-top">
                    <div class="file-icon-box"><i class="${iconClass}"></i></div>
                    <div>
                        <div class="file-title" title="${file.fileName}">${file.fileName}</div>
                        <div class="file-meta">Trashed</div>
                    </div>
                </div>
                <div class="card-actions-row">
                    <button class="btn-action restore" onclick="restoreFile(${file.id}, event)"><i class="fa-solid fa-rotate-left"></i> Restore</button>
                    <button class="btn-action delete-perm" onclick="deletePermanently(${file.id}, event)"><i class="fa-solid fa-xmark"></i> Delete</button>
                </div>
            `;
        } else {
            card.onclick = () => openLightbox(file, iconClass);
            card.innerHTML = `
                <div class="card-top">
                    <div class="file-icon-box"><i class="${iconClass}"></i></div>
                    <div style="flex: 1; overflow: hidden;">
                        <div class="file-title" title="${file.fileName}">${file.fileName}</div>
                        <div class="file-meta">${file.fileType || 'Digital Asset'}</div>
                    </div>
                    <button class="star-btn ${file.isStarred ? 'active' : ''}" onclick="toggleStar(${file.id}, event)">
                        <i class="fa-${file.isStarred ? 'solid' : 'regular'} fa-star"></i>
                    </button>
                </div>
                <div class="card-actions-row">
                    <span class="view-tag"><i class="fa-solid fa-eye"></i> Preview</span>
                    <button class="btn-action trash-icon" onclick="moveToTrash(${file.id}, event)" title="Move to Trash">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
        }

        fileList.appendChild(card);
    });
}

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    fetch("/api/files/upload", {
        method: "POST",
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        fileInput.value = "";
        loadFiles();
    })
    .catch(error => console.error("Error uploading:", error));
}

/* File Actions */
function toggleStar(id, event) {
    event.stopPropagation();
    const file = allFiles.find(f => f.id === id);
    if (file) {
        file.isStarred = !file.isStarred;
        renderFiles();
    }
}

function moveToTrash(id, event) {
    event.stopPropagation();
    const file = allFiles.find(f => f.id === id);
    if (file) {
        file.isTrashed = true;
        renderFiles();
    }
}

function restoreFile(id, event) {
    event.stopPropagation();
    const file = allFiles.find(f => f.id === id);
    if (file) {
        file.isTrashed = false;
        renderFiles();
    }
}

function deletePermanently(id, event) {
    event.stopPropagation();
    allFiles = allFiles.filter(f => f.id !== id);
    renderFiles();
}

/* Filter Helpers */
function setCategoryFilter(category, btnElement) {
    currentCategory = category;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    btnElement.classList.add('active');
    renderFiles();
}

function filterByCategory(file, category) {
    if (category === 'all') return true;
    const str = ((file.fileType || '') + " " + (file.fileName || '')).toLowerCase();
    
    if (category === 'image') return str.includes('image') || str.includes('jpg') || str.includes('png') || str.includes('jpeg');
    if (category === 'pdf') return str.includes('pdf');
    if (category === 'video') return str.includes('video') || str.includes('mp4');
    if (category === 'code') return str.includes('code') || str.includes('json') || str.includes('js') || str.includes('java');
    return true;
}

function filterFiles() {
    renderFiles();
}

/* Lightbox Modal Actions */
function openLightbox(file, iconClass) {
    document.getElementById('lightboxFileName').innerText = file.fileName;
    document.getElementById('lightboxFileType').innerText = file.fileType || 'Digital Asset';
    
    const downloadUrl = `/api/files/download/${file.id}`;
    const previewContainer = document.getElementById('lightboxPreviewContainer');
    const str = ((file.fileType || '') + " " + (file.fileName || '')).toLowerCase();

    // If it's an image, preview the actual image!
    if (str.includes('image') || str.includes('jpg') || str.includes('png') || str.includes('jpeg')) {
        previewContainer.innerHTML = `<img src="${downloadUrl}" alt="${file.fileName}">`;
    } else {
        previewContainer.innerHTML = `<i class="${iconClass}"></i>`;
    }

    document.getElementById('lightboxDownloadBtn').href = downloadUrl;
    document.getElementById('lightboxModal').classList.add('active');
}

function closeLightbox() {
    document.getElementById('lightboxModal').classList.remove('active');
}

function getIconForType(type, name) {
    const str = ((type || '') + " " + (name || '')).toLowerCase();
    if (str.includes('pdf')) return 'fa-solid fa-file-pdf';
    if (str.includes('image') || str.includes('jpg') || str.includes('png')) return 'fa-solid fa-file-image';
    if (str.includes('video') || str.includes('mp4')) return 'fa-solid fa-file-video';
    if (str.includes('code') || str.includes('json') || str.includes('js') || str.includes('java')) return 'fa-solid fa-file-code';
    return 'fa-solid fa-file-lines';
}