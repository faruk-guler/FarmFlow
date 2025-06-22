let projects = [];

// --- Tema Değiştirme Fonksiyonları ---
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.innerHTML = '🌙 Gece Modu';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '☀️ Gündüz Modu';
        localStorage.setItem('theme', 'dark');
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '☀️ Gündüz Modu';
    }
}

// --- Dosya İşlemleri ---

// Projeyi .ff dosyası olarak indirir (tekil proje güncellemeleri için)
function downloadProjectFile(project) {
    const filename = `FarmFlow_project_${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${project.id}.ff`;
    const content = JSON.stringify(project, null, 2); 
    
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`Proje "${project.name}" (${filename}) bilgisayarınıza indirildi.`);
}

// Toplu veya tekil proje yükleme için dosya seçimi
async function handleImport(input) {
    const files = input.files; // Birden fazla dosya olduğu için input.files'ı alıyoruz
    if (files.length === 0) {
        return; // Dosya seçilmediyse çık
    }

    let totalImported = 0;
    let totalUpdated = 0;

    for (const file of files) {
        if (!file.name.endsWith('.ff')) {
            console.warn(`"${file.name}" geçersiz bir .ff dosyası değil, atlanıyor.`);
            continue;
        }

        try {
            const fileContent = await readFileAsync(file); // Dosyayı asenkron olarak oku
            const parsedContent = JSON.parse(fileContent);

            if (parsedContent && parsedContent.projects && Array.isArray(parsedContent.projects)) {
                // Toplu proje formatı
                parsedContent.projects.forEach(projectData => {
                    if (isValidProject(projectData)) {
                        const existingProjectIndex = projects.findIndex(p => p.id === projectData.id);
                        if (existingProjectIndex !== -1) {
                            Object.assign(projects[existingProjectIndex], projectData); 
                            totalUpdated++;
                        } else {
                            projects.push(projectData);
                            totalImported++;
                        }
                    } else {
                        console.warn(`Geçersiz proje objesi (${file.name} içinde) atlandı:`, projectData);
                    }
                });
            } else if (isValidProject(parsedContent)) {
                // Tekil proje formatı
                const projectData = parsedContent;
                const existingProjectIndex = projects.findIndex(p => p.id === projectData.id);
                if (existingProjectIndex !== -1) {
                    Object.assign(projects[existingProjectIndex], projectData);
                    totalUpdated++;
                } else {
                    projects.push(projectData);
                    totalImported++;
                }
            } else {
                console.warn(`"${file.name}" geçersiz FarmFlow dosya formatı, atlanıyor.`);
            }
        } catch (error) {
            console.error(`"${file.name}" okunurken veya işlenirken hata oluştu:`, error);
        }
    }

    renderProjects(); // Tüm dosyalar işlendikten sonra projeleri tekrar çiz
    input.value = ''; // Input'u temizle
    alert(`İçe aktarma tamamlandı!\nYeni projeler: ${totalImported}\nGüncellenen projeler: ${totalUpdated}`);
}

// FileReader'ı Promise ile sarmalama
function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Proje verisinin geçerliliğini kontrol eden yardımcı fonksiyon
function isValidProject(data) {
    return data && typeof data.id === 'number' && typeof data.name === 'string' && data.name.trim() !== '';
}


// Tüm projeleri tek dosyada dışa aktarma (indirir)
function exportAllProjects() {
    if (projects.length === 0) {
        alert('Dışa aktarılacak proje bulunmuyor!');
        return;
    }
    
    const exportData = {
        app: "FarmFlow",
        exportDate: new Date().toISOString(),
        projectCount: projects.length,
        projects: projects
    };
    
    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FarmFlow_all_projects_${new Date().toISOString().split('T')[0]}.ff`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    alert(`${projects.length} proje başarıyla dışa aktarıldı ve bilgisayarınıza indirildi!`);
}

// --- Proje Yönetimi Fonksiyonları ---

// Proje ekleme
document.getElementById('projectForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const project = {
        id: Date.now(),
        name: document.getElementById('projectName').value,
        description: document.getElementById('projectDescription').value,
        status: document.getElementById('projectStatus').value,
        startDate: document.getElementById('projectStartDate').value,
        endDate: document.getElementById('projectEndDate').value,
        createdAt: new Date().toISOString(),
        tasks: []
    };

    // Tarihlerin geçerliliğini kontrol et
    if (project.startDate && project.endDate && new Date(project.startDate) > new Date(project.endDate)) {
        alert('Başlangıç tarihi bitiş tarihinden sonra olamaz!');
        return; 
    }

    projects.push(project);
    downloadProjectFile(project); // Yeni projeyi otomatik indir
    renderProjects();
    this.reset();
});

// Proje silme
function deleteProject(projectId) {
    if (confirm('Bu projeyi ve tüm görevlerini silmek istediğinizden emin misiniz?')) {
        projects = projects.filter(p => p.id !== projectId);
        renderProjects();
        alert('Proje başarıyla silindi. İndirilen .ff dosyasını manuel olarak silebilirsiniz.');
    }
}

// Proje durumu güncelleme
function updateProjectStatus(projectId, newStatus) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        project.status = newStatus;
        downloadProjectFile(project);
        renderProjects();
    }
}

// --- Görev Yönetimi Fonksiyonları ---

// Görev ekleme (inline)
function addTask(projectId) {
    const taskInput = document.getElementById(`newTaskInput-${projectId}`);
    const taskName = taskInput.value.trim();

    if (!taskName) {
        alert('Görev adı boş olamaz!');
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
        const task = {
            id: Date.now(),
            name: taskName,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        project.tasks.push(task);
        downloadProjectFile(project);
        renderProjects();
        taskInput.value = ''; // Görev eklendikten sonra input'u temizle
    }
}

// Görev tamamlama/geri alma
function toggleTask(projectId, taskId) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            downloadProjectFile(project);
            renderProjects();
        }
    }
}

// Görev silme
function deleteTask(projectId, taskId) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
        project.tasks = project.tasks.filter(t => t.id !== taskId);
        downloadProjectFile(project);
        renderProjects();
    }
}

// --- Projeleri Render Etme ve Filtreleme ---

// Proje durum metinlerini döner
function getStatusText(status) {
    const statusMap = {
        'planning': 'Planlama',
        'in-progress': 'Devam Ediyor',
        'completed': 'Tamamlandı',
        'on-hold': 'Beklemede'
    };
    return statusMap[status] || status;
}

// Projeleri ekranda gösterir (filtrelemeyi de uygular)
function renderProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';

    const searchTerm = document.getElementById('searchProjectName').value.toLowerCase();
    const filterStatus = document.getElementById('filterProjectStatus').value;

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm) ||
                              project.description.toLowerCase().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (filteredProjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-color); opacity: 0.7; margin-top: 50px;">Gösterilecek proje bulunmuyor. Yeni bir proje ekleyin veya filtreleri ayarlayın.</p>';
        return;
    }

    filteredProjects.forEach(project => {
        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        
        const completedTasks = project.tasks.filter(t => t.completed).length;
        const totalTasks = project.tasks.length;
        const taskProgressText = totalTasks > 0 ? `(${completedTasks}/${totalTasks})` : '(Henüz görev yok)';
        
        projectCard.innerHTML = `
            <div class="project-header">
                <div>
                    <div class="project-title">${project.name}</div>
                    <div class="project-dates">
                        Oluşturulma: ${new Date(project.createdAt).toLocaleDateString('tr-TR')}
                        ${project.startDate ? `<br>Başlangıç: ${new Date(project.startDate).toLocaleDateString('tr-TR')}` : ''}
                        ${project.endDate ? `<br>Bitiş: ${new Date(project.endDate).toLocaleDateString('tr-TR')}` : ''}
                    </div>
                </div>
                <div class="project-status status-${project.status}">
                    ${getStatusText(project.status)}
                </div>
            </div>
            
            <div class="project-description">${project.description || 'Açıklama bulunmuyor'}</div>
            
            <div class="tasks-section">
                <div class="tasks-header">
                    <div class="tasks-title">Görevler ${taskProgressText}</div>
                </div>
                <div class="add-task-form">
                    <input type="text" id="newTaskInput-${project.id}" placeholder="Yeni görev ekle..." onkeyup="if(event.key === 'Enter') addTask(${project.id})">
                    <button onclick="addTask(${project.id})">Ekle</button>
                </div>
                <ul class="task-list">
                    ${project.tasks.map(task => `
                        <li class="task-item ${task.completed ? 'completed' : ''}">
                            <input type="checkbox" class="task-checkbox" 
                                    ${task.completed ? 'checked' : ''} 
                                    onchange="toggleTask(${project.id}, ${task.id})">
                            <span class="task-text">${task.name}</span>
                            <div class="task-actions">
                                <button class="task-delete" onclick="deleteTask(${project.id}, ${task.id})">Sil</button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="project-actions">
                <select onchange="updateProjectStatus(${project.id}, this.value)">
                    <option value="planning" ${project.status === 'planning' ? 'selected' : ''}>Planlama</option>
                    <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>Devam Ediyor</option>
                    <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                    <option value="on-hold" ${project.status === 'on-hold' ? 'selected' : ''}>Beklemede</option>
                </select>
                <button class="btn btn-danger" onclick="deleteProject(${project.id})">Projeyi Sil</button>
            </div>
        `;
        
        container.appendChild(projectCard);
    });
}

// Projeleri filtreleme işlevi (arama kutusu ve durum seçimi)
function filterProjects() {
    renderProjects();
}

// Sayfa yüklendiğinde
window.onload = function() {
    loadTheme();
    renderProjects(); // Sayfa açıldığında projeleri render et
}