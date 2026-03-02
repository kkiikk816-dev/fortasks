// --- Configuration & Initialization ---
const SB_URL = 'https://tqjtouxxordmlxvifffg.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxanRvdXh4b3JkbWx4dmlmZmZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDU4MTMsImV4cCI6MjA4Njk4MTgxM30.A5M_u3lIXIGj099oTNsAg864deu1HHcSLpZUd9MrgjQ';

const sb = supabase.createClient(SB_URL, SB_KEY);

// Application State
const state = {
    user: null,
    profile: null,
    isAdmin: false,
    skills: JSON.parse(localStorage.getItem('mySkills')) || [],
    notes: localStorage.getItem('myNotes') || ''
};

// --- Constant Data (Local) ---
const masterSkills = [
    { id: 's1', title: 'Vital Signs (العلامات الحيوية)', desc: 'تسجيل دقيق للضغط، النبض، الحرارة، ومعدل التنفس' },
    { id: 's2', title: 'IV Cannulation (تركيب كانيولا)', desc: 'إدخال القسطرة الوريدية وتثبيتها بشكل معقم (Aseptic)' },
    { id: 's3', title: 'IM Injection (حقن عضلي)', desc: 'استهداف الزاوية والموقع الصحيحين (مثال: Gluteal or Deltoid)' },
    { id: 's4', title: 'Catheterization (قسطرة بولية)', desc: 'التنظيف، التعقيم الكامل، والتركيب السليم للمريض' },
    { id: 's5', title: 'Wound Dressing (تضميد جروح)', desc: 'إزالة الغيار التالف والتنظيف وتغيير الضمادات المعقمة' },
    { id: 's6', title: 'ECG Placement (تخطيط القلب)', desc: 'وضع الأقطاب (Electrodes) في مواقعها التشريحية الصحيحة V1-V6' }
];

const medicalDict = [
    { term: 'Bradycardia', meaning: 'بطء ضربات القلب (في البالغين: أقل من 60 نبضة/دقيقة)' },
    { term: 'Tachycardia', meaning: 'تسارع ضربات القلب (في البالغين: أكثر من 100 نبضة/دقيقة)' },
    { term: 'Hypertension', meaning: 'ارتفاع ضغط الدم الجهازي.' },
    { term: 'Hypotension', meaning: 'انخفاض ضغط الدم والتأثير المحتمل على التروية الدموية.' },
    { term: 'Hypoxia', meaning: 'نقص نسبة الأكسجين المتاحة في الأنسجة الخلوية.' },
    { term: 'Apnea', meaning: 'انقطاع التنفس العفوي (مؤقت أو مهدد للحياة).' },
    { term: 'Dyspnea', meaning: 'صعوبة أو ضيق في التنفس (الشعور بعدم الراحة).' },
    { term: 'Cyanosis', meaning: 'ازرقاق في الجلد والأغشية المخاطية نتيجة النقص الحاد في الأكسجين.' }
];

const dailyTips = [
    'التمريض ليس مجرد مهنة، بل هو فن وعلم لرعاية الإنسان.',
    'اغسل يديك دائماً قبل وبعد ملامسة المريض، تذكر خطورة العدوى المتقاطعة (Cross Infection).',
    'الابتسامة والهدوء في التعامل مع المرافقين جزء لا يتجزأ من العلاج النفسي.',
    'تأكد دائماً من "الخمسة أصول" قبل إعطاء الدواء: Right Patient, Right Drug, Right Dose, Right Route, Right Time.'
];

// --- Boot Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    const dailyTipEl = document.getElementById('daily-tip');
    if (dailyTipEl) {
        dailyTipEl.innerText = dailyTips[Math.floor(Math.random() * dailyTips.length)];
    }
    const notesEl = document.getElementById('my-notes');
    if (notesEl) {
        notesEl.value = state.notes;
    }

    setupDictSearch();
    renderSkills();

    // Splash Screen Hiding Logic
    const hideSplash = () => {
        const splash = document.getElementById('splash-screen');
        if (!splash || splash.style.display === 'none') return;

        splash.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        splash.style.opacity = '0';
        splash.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            splash.style.display = 'none';
        }, 600);
    };

    // Failsafe: Always hide splash after 4 seconds even if auth fails
    const splashFailsafe = setTimeout(hideSplash, 3500);

    // Initial Auth State
    try {
        const { data: { session } } = await sb.auth.getSession();
        await handleAuthChange(session);
        // If successful, hide splash sooner
        setTimeout(hideSplash, 1000);
    } catch (err) {
        console.error("Auth init failed:", err);
        hideSplash(); // Show whatever we have (auth or placeholder)
    }

    sb.auth.onAuthStateChange(async (_event, session) => {
        await handleAuthChange(session);
    });

    setupBottomNavScroll();
});

function setupBottomNavScroll() {
    let lastScrollY = 0;
    const bottomNav = document.getElementById('bottom-nav');
    const scrollContainer = document.querySelector('.screen.active'); // Initial active screen

    // Since it's a SPA, we need to handle scroll on the active screen
    document.querySelectorAll('.screen').forEach(screen => {
        screen.addEventListener('scroll', () => {
            if (window.innerWidth > 500) return; // Only for mobile-like views
            const currentScrollY = screen.scrollTop;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                bottomNav.classList.add('hide');
            } else {
                bottomNav.classList.remove('hide');
            }
            lastScrollY = currentScrollY;
        });
    });
}

// --- Auth & Profile Management ---
async function handleAuthChange(session) {
    if (session) {
        state.user = session.user;
        await checkAdmin();
        await loadProfile();
        showApp();
        loadSupabaseData();
    } else {
        state.user = null;
        state.profile = null;
        state.isAdmin = false;
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('app-container').classList.remove('active');
    }
}

async function checkAdmin() {
    if (!state.user) return;
    const { data } = await sb.from('admin_list').select('email').eq('email', state.user.email).single();
    state.isAdmin = !!data;
}

async function loadProfile() {
    if (!state.user) return;
    const { data, error } = await sb.from('profiles').select('*').eq('id', state.user.id).single();
    if (data) {
        state.profile = data;
    } else {
        const defaultProfile = {
            id: state.user.id,
            full_name: state.user.user_metadata?.full_name || 'طالب',
            gender: state.user.user_metadata?.gender || 'male',
            avatar: state.user.user_metadata?.gender === 'female'
                ? `https://api.dicebear.com/7.x/notionists/svg?seed=f_${state.user.id}&backgroundColor=fce4ec`
                : `https://api.dicebear.com/7.x/notionists/svg?seed=m_${state.user.id}&backgroundColor=e3f2fd`
        };
        const { data: newProf } = await sb.from('profiles').upsert(defaultProfile).select().single();
        state.profile = newProf || defaultProfile;
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
        form.style.display = 'none';
    });

    if (tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').style.display = 'block';
        setTimeout(() => document.getElementById('login-form').classList.add('active'), 10);
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').style.display = 'block';
        setTimeout(() => document.getElementById('register-form').classList.add('active'), 10);
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الدخول...';

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    btn.innerHTML = originalText;

    if (error) {
        document.getElementById('auth-error').innerText = "خطأ في تسجيل الدخول. يرجى مراجعة البريد أو كلمة المرور.";
    } else {
        document.getElementById('auth-error').innerText = "";
        showToast('مرحباً بك مجدداً دكتور', 'success');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> استخراج ההوية...';

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-password').value;
    const gender = document.getElementById('reg-gender').value;

    const { data, error } = await sb.auth.signUp({
        email,
        password: pass,
        options: {
            data: { full_name: name, gender: gender }
        }
    });

    btn.innerHTML = originalText;

    if (error) {
        document.getElementById('auth-error').innerText = error.message;
    } else {
        document.getElementById('auth-error').innerText = "";
        if (data && data.user) {
            await sb.from('students').insert([{ id: data.user.id, email: email }]);
        }
        showToast('تم اعتماد حسابك! يرجى الاستمرار وتسجيل الدخول.', 'success');
        switchAuthTab('login');
    }
});

async function logout() {
    await sb.auth.signOut();
    closeSidebar();
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('auth-screen').classList.remove('active');

    document.getElementById('app-container').style.display = 'block';
    setTimeout(() => { document.getElementById('app-container').classList.add('active'); }, 50);

    const profName = state.profile?.full_name || 'طالب تمريض';
    const profAvatar = state.profile?.avatar || `https://api.dicebear.com/7.x/notionists/svg?seed=fallback`;

    document.getElementById('header-name').innerText = profName.split(' ')[0] || profName;
    document.getElementById('header-avatar').src = profAvatar;

    document.getElementById('prof-name').innerText = profName;
    document.getElementById('prof-email').innerText = state.user?.email || 'email@example.com';
    document.getElementById('prof-avatar').src = profAvatar;

    if (state.profile) {
        document.getElementById('prof-stage').value = state.profile.stage || '';
        document.getElementById('prof-group').value = state.profile.study_group || '';
        document.getElementById('prof-telegram').value = state.profile.telegram || '';
    }

    if (state.isAdmin) {
        document.getElementById('admin-menu-item').style.display = 'flex';
    } else {
        document.getElementById('admin-menu-item').style.display = 'none';
    }
}

// --- Navigation SPA ---
function navigate(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active', 'slide-up');
    });

    const target = document.getElementById(`page-${pageId}`);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('slide-up', 'active'), 10);
    }

    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.dataset.target === pageId) nav.classList.add('active');
    });
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'flex';
    setTimeout(() => document.getElementById('sidebar-overlay').style.opacity = '1', 10);
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.opacity = '0';
    setTimeout(() => document.getElementById('sidebar-overlay').style.display = 'none', 300);
}

// --- UI Utilities ---
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation text-danger';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = 'toast'; }, 3000);
}

// --- Fetching Data from Supabase ---
async function loadSupabaseData() {
    fetchQuiz();
    fetchLatestAd();
    fetchLibrary('all');
    fetchBuddies();
    fetchSchedule();
    fetchTodaySchedule();
    fetchSkills(); // New skills fetcher
}

// 1. Daily Quiz (`daily_quiz`)
let currentQuiz = null;
async function fetchQuiz() {
    const { data } = await sb.from('daily_quiz').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (data) {
        currentQuiz = data;
        document.getElementById('quiz-question').innerText = data.question;
        const optsDiv = document.getElementById('quiz-options');
        optsDiv.innerHTML = '';

        const optionsList = [
            { id: 'a', text: data.option_a },
            { id: 'b', text: data.option_b },
            { id: 'c', text: data.option_c }
        ];

        optionsList.forEach((opt) => {
            if (!opt.text) return;
            const div = document.createElement('div');
            div.className = 'quiz-option';
            div.innerText = opt.text;
            div.onclick = () => answerQuiz(opt.id, div, optionsList);
            optsDiv.appendChild(div);
        });
        document.getElementById('quiz-feedback').style.display = 'none';
    } else {
        document.getElementById('quiz-question').innerText = 'لا يوجد سؤال سريري اليوم 🩺';
        document.getElementById('quiz-options').innerHTML = '';
    }
}

function answerQuiz(selectedId, el, optionsList) {
    if (!currentQuiz || el.parentNode.classList.contains('answered')) return;
    el.parentNode.classList.add('answered');
    const feedback = document.getElementById('quiz-feedback');

    if (selectedId === currentQuiz.correct_option) {
        el.classList.add('correct');
        feedback.innerHTML = `<strong class="text-success"><i class="fa-solid fa-check"></i> نعم، إجابة دقيقة!</strong><div class="mt-1">${currentQuiz.explanation || 'تفسير ممتاز للسؤال.'}</div>`;
    } else {
        el.classList.add('wrong');
        const correctIndex = optionsList.findIndex(o => o.id === currentQuiz.correct_option);
        if (correctIndex !== -1 && el.parentNode.children[correctIndex]) {
            el.parentNode.children[correctIndex].classList.add('correct');
        }
        feedback.innerHTML = `<strong class="text-danger"><i class="fa-solid fa-times"></i> للأسف غير دقيقة!</strong><div class="mt-1 text-muted">${currentQuiz.explanation || 'يرجى مراجعة المصدر للمزيد من المعلومات.'}</div>`;
    }
    feedback.style.display = 'block';
    feedback.classList.add('slide-up');
}

async function fetchLatestAd() {
    const { data } = await sb.from('ads').select('*').order('created_at', { ascending: false }).limit(1).single();
    const container = document.getElementById('latest-announcement');
    if (!container) return;

    if (data) {
        const dateObj = new Date(data.created_at);
        const dateStr = dateObj.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
        container.innerHTML = `
            <div class="ad-card glass-card" style="padding: 1rem; border-radius: 12px;">
                <div style="flex:1;">
                    <p style="font-size:0.9rem; font-weight:700;">${data.content}</p>
                    <small class="text-muted" style="display:block; margin-top:0.4rem; font-size: 0.7rem;"><i class="fa-regular fa-clock"></i> ${dateStr}</small>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-muted text-center" style="font-size: 0.8rem;">لا توجد تبليغات حالياً</p>`;
    }
}

// 2. Full Ads List (for potential archive/drawer)
async function fetchAds() {
    const { data } = await sb.from('ads').select('*').order('created_at', { ascending: false }).limit(10);
    const list = document.getElementById('announcements-list');
    if (!list) return;
    list.innerHTML = '';
    // ... logic for full list if needed ...
}

// 3. Library (`lectures`)
async function fetchLibrary() {
    const list = document.getElementById('library-list');
    const tabsContainer = document.getElementById('library-tabs');
    if (!list) return;

    const { data, error } = await sb.from('lectures').select('*').order('created_at', { ascending: true });
    if (error || !data) return;

    // Grouping data by subject_type
    const groups = data.reduce((acc, item) => {
        const type = item.subject_type || 'أخرى';
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
    }, {});

    const uniqueTypes = Object.keys(groups);

    // Dynamic Navigation Buttons for Subjects
    if (tabsContainer) {
        tabsContainer.innerHTML = uniqueTypes.map(type => `
            <button class="tab-pill" style="white-space:nowrap;" onclick="document.getElementById('subj-${type}').scrollIntoView({behavior:'smooth'})">${type}</button>
        `).join('');
    }

    list.innerHTML = '';

    if (uniqueTypes.length === 0) {
        list.innerHTML = `<div class="glass-card text-center" style="grid-column: 1/-1; padding: 3rem;">
            <i class="fa-solid fa-book-open-reader" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom:1rem; display:block;"></i>
            <p class="text-muted">المكتبة فارغة حالياً..</p>
        </div>`;
        return;
    }

    uniqueTypes.forEach(type => {
        const subjectLectures = groups[type];
        list.innerHTML += `
            <div id="subj-${type}" class="glass-card slide-up mb-3" style="padding:1.2rem; border-right: 4px solid var(--primary);">
                <h3 style="font-size:1.1rem; margin-bottom:1rem; color:var(--primary); display:flex; align-items:center; gap:0.6rem;">
                    <i class="fa-solid fa-layer-group"></i> ${type}
                    <span style="font-size:0.75rem; background:rgba(14, 165, 233, 0.1); padding:0.2rem 0.6rem; border-radius:30px;">${subjectLectures.length} محاضرات</span>
                </h3>
                <div class="subject-items-list" style="display:flex; flex-direction:column; gap:0.6rem;">
                    ${subjectLectures.map((lec, idx) => `
                        <div class="lib-row-item" style="display:flex; align-items:center; gap:0.8rem; padding:0.6rem; background:rgba(255,255,255,0.03); border-radius:8px;">
                            <span style="font-size:0.8rem; color:var(--text-muted); font-weight:800; min-width:20px;">${idx + 1}.</span>
                            <div style="flex:1;">
                                <h4 style="font-size:0.85rem;">${lec.title}</h4>
                            </div>
                            <button class="action-btn" onclick="window.open('${lec.link}', '_blank')" style="background:transparent; border:none; color:var(--primary); font-size:1rem;">
                                <i class="fa-solid fa-cloud-arrow-down"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
}

// 4. Skills Checklist
function renderSkills() {
    const list = document.getElementById('skills-list');
    if (!list) return;

    const completedCount = state.skills.length;
    const progressPercent = masterSkills.length > 0 ? Math.round((completedCount / masterSkills.length) * 100) : 0;

    const progressBar = document.getElementById('skills-progress-bar');
    const progressText = document.getElementById('skills-progress-text');
    const congrats = document.getElementById('skills-congrats');

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.innerText = `أنجزت ${progressPercent}% من المهارات (${completedCount}/${masterSkills.length})`;

    if (progressPercent === 100 && masterSkills.length > 0) {
        if (congrats) congrats.style.display = 'block';
    } else {
        if (congrats) congrats.style.display = 'none';
    }

    list.innerHTML = '';
    masterSkills.forEach(skill => {
        const isCompleted = state.skills.includes(skill.id);
        list.innerHTML += `
            <div class="skill-item glass-card ${isCompleted ? 'completed' : ''}" style="padding: 0.8rem; margin-bottom:0.5rem;" onclick="toggleSkill('${skill.id}', this)">
                <div class="skill-checkbox" style="width:24px; height:24px; border:2px solid ${isCompleted ? 'var(--success)' : 'var(--glass-border)'}; border-radius:6px; display:flex; justify-content:center; align-items:center;">
                    <i class="fa-solid fa-check" style="${isCompleted ? 'display:block; color:var(--success)' : 'display:none'}"></i>
                </div>
                <div class="skill-content" style="margin-right:1rem;">
                    <h4 class="skill-title" style="font-size:0.9rem; margin-bottom:0.15rem;">${skill.title}</h4>
                    <p style="font-size:0.7rem; color:var(--text-muted); line-height:1.2;">${skill.desc}</p>
                </div>
            </div>
        `;
    });
}

function toggleSkill(id, el) {
    const idx = state.skills.indexOf(id);
    if (idx > -1) {
        state.skills.splice(idx, 1);
    } else {
        state.skills.push(id);
        showToast('تم إتقان المهارة! استمر!', 'success');
    }
    localStorage.setItem('mySkills', JSON.stringify(state.skills));
    renderSkills();
}

// 5. Dictionary Search
function setupDictSearch() {
    const input = document.getElementById('dict-search');
    const resultsDiv = document.getElementById('dict-results');
    input.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) { resultsDiv.innerHTML = ''; return; }
        const matches = medicalDict.filter(i => i.term.toLowerCase().includes(query) || i.meaning.includes(query));
        resultsDiv.innerHTML = matches.length ? matches.map(m => `
            <div style="padding:1.2rem; background:rgba(15, 23, 42, 0.4); border-radius:12px; margin-bottom:0.5rem; border-right:3px solid var(--primary);">
                <strong class="text-primary latin-text" style="font-size:1.15rem; letter-spacing:1px;">${m.term}</strong>
                <p style="margin-top:0.4rem; color:#cbd5e1; font-weight:600;">${m.meaning}</p>
            </div>
        `).join('') : '<p class="text-muted text-center" style="padding:1rem;">لم يتم العثور على مصطلح طبي بهذا الاسم.</p>';
    });
}

// 6. Notes
function saveNotes() {
    state.notes = document.getElementById('my-notes').value;
    localStorage.setItem('myNotes', state.notes);
    showToast('تم حفظ الملاحظات السريرية في جهازك بنجاح.', 'success');
}

// 7. Study Buddy (`study_requests`)
async function fetchBuddies() {
    const { data } = await sb.from('study_requests').select('*').order('created_at', { ascending: false });
    const list = document.getElementById('buddy-list');
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-muted text-center" style="padding:2rem">لا يوجد طلبات لمشاركة الدراسة في الوقت الحالي.</p>`;
        return;
    }

    data.forEach(b => {
        const avatarUrl = b.gender === 'female'
            ? `https://api.dicebear.com/7.x/notionists/svg?seed=f_${b.user_id}&backgroundColor=fce4ec`
            : `https://api.dicebear.com/7.x/notionists/svg?seed=m_${b.user_id}&backgroundColor=e3f2fd`;

        const isMe = state.user?.id === b.user_id;

        list.innerHTML += `
            <div class="buddy-item">
                <div class="buddy-header">
                    <div class="buddy-user">
                        <img src="${avatarUrl}" alt="Avatar">
                        <div>
                            <h4>${b.full_name || 'طالب מجهول'} ${isMe ? '<i class="fa-solid fa-crown text-warning"></i>' : ''}</h4>
                            <span><i class="fa-solid fa-calendar-day"></i> منذ فترة قصيرة</span>
                        </div>
                    </div>
                </div>
                <div class="buddy-content">
                    <div class="buddy-subject"><i class="fa-solid fa-book-medical"></i> دراسة: ${b.subject}</div>
                    ${b.details ? `<div class="buddy-details">${b.details}</div>` : ''}
                </div>
                ${!isMe ? `<a href="https://t.me/${b.tele_user?.replace('@', '')}" target="_blank" class="btn primary-btn buddy-action" style="padding:0.7rem; font-size:0.95rem; border-radius:12px;"><i class="fa-brands fa-telegram"></i> رسالة عبر تليجرام</a>` : ''}
            </div>
        `;
    });
}

async function submitBuddyRequest() {
    const subject = document.getElementById('buddy-subject').value;
    const tele_user = document.getElementById('buddy-tele').value;
    const details = document.getElementById('buddy-details').value;

    if (!subject || !tele_user) return showToast('ضرورة إضافة المادة وحسابك للتواصل.', 'error');

    const { error } = await sb.from('study_requests').insert([{
        user_id: state.user.id,
        full_name: state.profile?.full_name || 'طالب تمريض',
        tele_user: tele_user,
        subject: subject,
        gender: state.profile?.gender || 'male',
        details: details,
        is_approved: true // Instant approved for demo, logic by default false if strict admin flow
    }]);

    if (error) {
        showToast('حدث خطأ بالاتصال، جرب مرة أخرى.', 'error');
    } else {
        document.getElementById('buddy-modal').style.display = 'none';
        document.getElementById('buddy-subject').value = '';
        document.getElementById('buddy-tele').value = '';
        document.getElementById('buddy-details').value = '';
        fetchBuddies();
        showToast('تم طرح طلبك أمام الزملاء بنجاح!', 'success');
    }
}

// 8. Weekly Schedule (`schedule`)
async function fetchSchedule() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const activePill = document.querySelector('#schedule-tabs .tab-pill.active');
    const filterDay = activePill ? activePill.innerText : days[0];

    filterSchedule(filterDay);
}

async function filterSchedule(day, el) {
    if (el) {
        document.querySelectorAll('#schedule-tabs .tab-pill').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    }

    const { data } = await sb.from('schedule').select('*').eq('day', day).order('created_at', { ascending: true });
    const list = document.getElementById('schedule-container');
    if (!list) return;
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = `<div class="glass-card text-center slide-up" style="grid-column:1/-1; padding: 2rem;">
            <i class="fa-solid fa-mug-hot" style="font-size: 1.6rem; color: var(--text-muted); margin-bottom: 0.6rem; display: block;"></i>
            <p class="text-muted" style="font-size: 0.85rem;">لا توجد محاضرات في هذا اليوم ☕</p>
        </div>`;
        return;
    }

    let html = `
        <div class="glass-card slide-up" style="padding: 1.2rem; border-radius: 20px;">
            <h3 style="margin-bottom:1.2rem; font-size:1.1rem; border-bottom:1px solid var(--glass-border); padding-bottom:0.5rem;">${day}</h3>
            <div class="schedule-horizontal-row">
                ${data.map((s, idx) => `
                    <div style="flex: 1; padding-left: 1.5rem; ${idx !== data.length - 1 ? 'border-left: 2px dashed var(--glass-border)' : ''}; min-width: 140px;">
                        <p style="font-size: 0.75rem; color: var(--primary); font-weight: 800; margin-bottom: 0.3rem;">محاضرة ${['أولى', 'ثانية', 'ثالثة', 'رابعة', 'خامسة'][idx] || (idx + 1)}</p>
                        <p style="font-size: 0.95rem; font-weight: 800; color: #fff; line-height: 1.2; margin-bottom: 0.4rem;">${s.subject}</p>
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.2rem;"><i class="fa-regular fa-clock"></i> ${s.time}</p>
                        <p style="font-size: 0.7rem; color: var(--secondary);"><i class="fa-solid fa-location-dot"></i> ${s.hall}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    list.innerHTML = html;
}

async function fetchTodaySchedule() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = days[new Date().getDay()];

    const { data } = await sb.from('schedule').select('*').eq('day', today).order('created_at', { ascending: true });
    const list = document.getElementById('today-schedule-list');
    if (!list) return;
    list.innerHTML = '';

    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-muted text-center" style="padding:1rem; font-size: 0.85rem;">لا يوجد محاضرات لليوم ☕</p>`;
        return;
    }

    data.forEach(s => {
        list.innerHTML += `
            <div class="today-sched-item">
                <div class="today-sched-info">
                    <span class="today-sched-subject">${s.subject}</span>
                    <span class="today-sched-meta">${s.time} | ${s.hall}</span>
                </div>
                <i class="fa-solid fa-chevron-left" style="font-size: 0.7rem; color: var(--text-muted);"></i>
            </div>
        `;
    });
}

// 9. Profile Update (`profiles`)
async function updateProfile() {
    if (!state.user) return;
    const stage = document.getElementById('prof-stage').value;
    const study_group = document.getElementById('prof-group').value;
    const telegram = document.getElementById('prof-telegram').value;

    const updates = { stage, study_group, telegram };

    const { error } = await sb.from('profiles').update(updates).eq('id', state.user.id);

    if (error) {
        showToast('حدث خطأ في ربط البيانات بقاعدة البيانات.', 'error');
    } else {
        state.profile = { ...state.profile, ...updates };
        showToast('تم تعزيز الهوية السريرية في المنظومة.', 'success');
    }
}

// 10. Admin Logic
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tabs .filter-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.querySelectorAll('.admin-panel-section').forEach(s => s.style.display = 'none');
    document.getElementById(`admin-${tab}`).style.display = 'block';

    if (tab === 'users') fetchUsers();
}

async function fetchUsers() {
    const list = document.getElementById('admin-users-list');
    if (!list) return;
    list.innerHTML = '<div class="text-center p-3"><i class="fa-solid fa-spinner fa-spin"></i> جاري جلب البيانات...</div>';

    const { data, error } = await sb.from('profiles').select('*').order('full_name', { ascending: true });
    if (error) return showToast('خطأ في جلب المستخدمين', 'error');

    list.innerHTML = '';
    data.forEach(u => {
        list.innerHTML += `
            <div class="glass-card" style="padding: 1rem; border-radius: 12px; display:flex; align-items:center; gap:1rem;">
                <img src="${u.avatar || ''}" style="width:50px; height:50px; border-radius:50%; background:var(--glass-bg);">
                <div style="flex:1;">
                    <h4 style="font-size:0.95rem; margin-bottom:0.2rem;">${u.full_name}</h4>
                    <p style="font-size:0.75rem; color:var(--text-muted);">
                        المرحلة: ${u.stage || 'غير محدد'} | الشعبة: ${u.study_group || 'غير محدد'} | الجنس: ${u.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </p>
                    ${u.telegram ? `<a href="https://t.me/${u.telegram.replace('@', '')}" target="_blank" style="font-size:0.75rem; color:var(--primary); text-decoration:none;"><i class="fa-brands fa-telegram"></i> ${u.telegram}</a>` : ''}
                </div>
            </div>
        `;
    });
}

async function addAd() {
    const content = document.getElementById('admin-ad-content').value;
    if (!content) return showToast('هيكل التعميم فارغ!', 'error');

    const { error } = await sb.from('ads').insert([{ content }]);
    if (error) showToast('خطأ في الاتصال.', 'error');
    else {
        showToast('تم رمي التعميم للساحة العامة!', 'success');
        document.getElementById('admin-ad-content').value = '';
        fetchLatestAd();
    }
}