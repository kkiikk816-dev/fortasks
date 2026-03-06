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
    notes: localStorage.getItem('myNotes') || '',
    ai: {
        pdfTexts: [],
        history: [], // For memory
        isQuizMode: false,
        controller: null, // For AbortController
        lastQuestion: ""
    }
};

const GROQ_API_KEY = "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"; // User should replace this
const GROQ_MODEL = "llama-3.1-8b-instant";

// PDF.js Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const masterSkills = [
    { id: 's1', title: 'Vital Signs (العلامات الحيوية)', desc: 'تسجيل دقيق للضغط، النبض، الحرارة، ومعدل التنفس (RR, BP, HR, T)' },
    { id: 's2', title: 'IV Cannulation (تركيب كانيولا)', desc: 'إدخال القسطرة الوريدية وتثبيتها بشكل معقم (Aseptic technique)' },
    { id: 's3', title: 'IM Injection (حقن عضلي)', desc: 'استهداف الزاوية والموقع الصحيحين (مثال: Gluteal or Deltoid)' },
    { id: 's4', title: 'Urinary Catheterization (قسطرة بولية)', desc: 'التنظيف، التعقيم الكامل، والتركيب السليم للمريض لتفريغ البول' },
    { id: 's5', title: 'Wound Dressing (تضميد جروح)', desc: 'إزالة الغيار التالف والتنظيف وتغيير الضمادات المعقمة (Wound Care)' },
    { id: 's6', title: 'ECG Placement (تخطيط القلب)', desc: 'وضع الأقطاب (Electrodes) في مواقعها التشريحية الصحيحة V1-V6 وقراءة النتائج' },
    { id: 's7', title: 'CPR (الإنعاش القلبي الرئوي)', desc: 'إجراء الإنعاش الأساسي للبالغين والأطفال واستخدام الـ Defibrillator' },
    { id: 's8', title: 'GCS Assessment (مقياس غلاسكو)', desc: 'تقييم مستوى الوعي والاستجابة العصبية للمرضى' },
    { id: 's9', title: 'Oxygen Therapy (علاج الأكسجين)', desc: 'ضبط تدفق الأكسجين واستخدام الأجهزة المناسبة حسب حالة المريض' },
    { id: 's10', title: 'Suctioning (سحب الإفرازات)', desc: 'تنظيف مجرى الهواء وإخراج الإفرازات لضمان تنفس سليم' }
];

const medicalDict = [
    // أمراض وحالات عامة
    { term: 'Bradycardia', meaning: 'بطء ضربات القلب (أقل من 60 نبضة/دقيقة في البالغين)' },
    { term: 'Tachycardia', meaning: 'تسارع ضربات القلب (أكثر من 100 نبضة/دقيقة في البالغين)' },
    { term: 'Hypertension (HTN)', meaning: 'ارتفاع ضغط الدم الجهازي' },
    { term: 'Hypotension', meaning: 'انخفاض ضغط الدم والتأثير المحتمل على التروية' },
    { term: 'Hypoxia', meaning: 'نقص نسبة الأكسجين المتاحة في الأنسجة الخلوية' },
    { term: 'Apnea', meaning: 'انقطاع التنفس العفوي' },
    { term: 'Dyspnea', meaning: 'صعوبة أو ضيق في التنفس' },
    { term: 'Cyanosis', meaning: 'ازرقاق في الجلد والأغشية المخاطية نتيجة النقص الحاد في الأكسجين' },
    { term: 'Orthopnea', meaning: 'صعوبة التنفس الاضطجاعي (يزداد عند الاستلقاء)' },
    { term: 'Cardiomegaly', meaning: 'تضخم القلب (زيادة حجم القلب بشكل غير طبيعي)' },
    { term: 'Ischemia', meaning: 'نقص التروية (انخفاض تدفق الدم والأكسجين للأعضاء)' },
    { term: 'Arrhythmia', meaning: 'اضطراب نظم القلب (ضربات قلب غير منتظمة)' },
    { term: 'Atherosclerosis', meaning: 'تصلب الشرايين (بسبب تراكم اللويحات الدهنية)' },
    { term: 'Myocardial Infarction', meaning: 'احتشاء عضلة القلب (نوبة قلبية)' },
    { term: 'Angina Pectoris', meaning: 'الذبحة الصدرية' },
    { term: 'Edema', meaning: 'الوذمة (تراكم السوائل في الأنسجة أو الرئتين)' },
    { term: 'Hypoglycemia', meaning: 'انخفاض سكر الدم' },
    { term: 'Polyuria', meaning: 'كثرة التبول' },
    { term: 'Hemiplegia', meaning: 'شلل نصفي' },
    { term: 'Quadriplegia', meaning: 'شلل رباعي' },

    // اختصارات التقييم والمستشفى
    { term: 'BP', meaning: 'ضغط الدم (Blood Pressure)' },
    { term: 'HR', meaning: 'معدل نبض القلب (Heart Rate)' },
    { term: 'RR', meaning: 'معدل التنفس (Respiratory Rate)' },
    { term: 'T', meaning: 'درجة الحرارة (Temperature)' },
    { term: 'SpO2', meaning: 'تشبع الأكسجين في الدم (Oxygen Saturation)' },
    { term: 'ICU', meaning: 'وحدة العناية المركزة (Intensive Care Unit)' },
    { term: 'ER', meaning: 'غرفة الطوارئ (Emergency Room)' },
    { term: 'CC', meaning: 'الشكوى الرئيسية للمريض (Chief Complaint)' },
    { term: 'Dx', meaning: 'تشخيص (Diagnosis)' },
    { term: 'Tx', meaning: 'علاج (Treatment)' },
    { term: 'Rx', meaning: 'وصفة طبية (Prescription)' },
    { term: 'Hx', meaning: 'تاريخ مرضي (History)' },
    { term: 'S/S', meaning: 'علامات وأعراض (Signs & Symptoms)' },
    { term: 'I/O', meaning: 'مراقبة السوائل الداخلة والخارجة (Intake & Output)' },

    // طرق إعطاء الأدوية
    { term: 'IV', meaning: 'وريدي (Intravenous)' },
    { term: 'IM', meaning: 'عضلي (Intramuscular)' },
    { term: 'SC', meaning: 'تحت الجلد (Subcutaneous)' },
    { term: 'PO', meaning: 'عن طريق الفم (Per Oral)' },
    { term: 'NPO', meaning: 'لا شيء عن طريق الفم (Nothing Per Oral)' },

    // أمراض واختصارات شائعة
    { term: 'DM', meaning: 'مرض السكري (Diabetes Mellitus)' },
    { term: 'COPD', meaning: 'انسداد رئوي مزمن (Chronic Obstructive Pulmonary Disease)' },
    { term: 'UTI', meaning: 'التهاب المسالك البولية (Urinary Tract Infection)' },
    { term: 'SOB', meaning: 'ضيق نفس (Shortness of Breath)' },
    { term: 'N/V', meaning: 'غثيان وقيء (Nausea & Vomiting)' },
    { term: 'CBC', meaning: 'فحص دم كامل (Complete Blood Count)' },
    { term: 'CXR', meaning: 'أشعة صدر (Chest X-ray)' },
    { term: 'MRI', meaning: 'رنين مغناطيسي (Magnetic Resonance Imaging)' },

    // المصطلحات الجراحية والالتهابات
    { term: 'Appendectomy', meaning: 'استئصال الزائدة الدودية' },
    { term: 'Mastectomy', meaning: 'استئصال الثدي' },
    { term: 'Tracheotomy', meaning: 'شق القصبة الهوائية' },
    { term: 'Colostomy', meaning: 'فغر القولون' },
    { term: 'Endoscopy', meaning: 'تنظير داخلي' },
    { term: 'Hepatitis', meaning: 'التهاب الكبد' },
    { term: 'Nephritis', meaning: 'التهاب الكلية' },
    { term: 'Myalgia', meaning: 'ألم العضلات' },
    { term: 'Neuralgia', meaning: 'ألم الأعصاب' }
];


// dailyTips removed - no longer used in UI

// --- Boot Logic ---
document.addEventListener('DOMContentLoaded', async () => {
    // Daily Tip removed.
    const notesEl = document.getElementById('my-notes');
    if (notesEl) {
        notesEl.value = state.notes;
    }

    setupDictSearch();
    renderSkills();

    // Initial profile display if state is preset
    if (state.user) showApp();

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
    btn.innerHTML = '<i class=\"fa-solid fa-spinner fa-spin"></i> جاري الدخول...';

    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    btn.innerHTML = originalText;

    if (error) {
        document.getElementById('auth-error').innerText = "خطأ في تسجيل الدخول. يرجى مراجعة البريد أو كلمة المرور.";
    } else {
        document.getElementById('auth-error').innerText = "";
        showToast('مرحباً بك مجدداً ممرضنا', 'success');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إنشاء الحساب...';

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

    // Fill profile inputs
    const emailInput = document.getElementById('prof-email-input');
    const genderInput = document.getElementById('prof-gender-input');
    if (emailInput) emailInput.value = state.user?.email || '';
    if (genderInput) genderInput.value = state.profile?.gender === 'female' ? 'أنثى' : 'ذكر';

    if (state.profile) {
        const stageEl = document.getElementById('prof-stage');
        const groupEl = document.getElementById('prof-group');
        const teleEl = document.getElementById('prof-telegram');
        if (stageEl) stageEl.value = state.profile.stage || '';
        if (groupEl) groupEl.value = state.profile.study_group || '';
        if (teleEl) teleEl.value = state.profile.telegram || '';
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

    if (pageId === 'chat') {
        document.body.classList.add('ai-active');
        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.style.display = 'flex';
            setTimeout(() => target.classList.add('slide-up', 'active'), 10);
        }
        const chatWin = document.getElementById('chat-window');
        const welcomeMsg = document.getElementById('ai-welcome-msg');
        if (chatWin && welcomeMsg) {
            if (state.ai.history.length === 0 && chatWin.children.length === 0) {
                welcomeMsg.style.display = 'flex';
                chatWin.style.display = 'none';
            } else {
                welcomeMsg.style.display = 'none';
                chatWin.style.display = 'flex';
            }
        }
    } else {
        document.body.classList.remove('ai-active');
    }

    if (pageId === 'admin') {
        switchAdminTab('dashboard-grid');
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
    fetchQuizzesList();
    fetchLatestAd();
    fetchAds(); 
    fetchLibrary();
    fetchBuddies();
    fetchSchedule();
    fetchTodaySchedule();
    renderSkills(); // Using local render since skills are stored locally
}

// 1. Daily Quiz (`daily_quiz`)
let currentQuiz = null;
async function fetchQuiz() {
    const { data } = await sb.from('daily_quiz').select('*').order('created_at', { ascending: false }).limit(1).single();
    if (data) {
        currentQuiz = data;
        const qEl = document.getElementById('quiz-question');
        if (qEl) qEl.innerText = data.question;
        const optsDiv = document.getElementById('quiz-options');
        if (optsDiv) {
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
        }
        const feedbackEl = document.getElementById('quiz-feedback');
        if (feedbackEl) feedbackEl.style.display = 'none';
    } else {
        const qEl = document.getElementById('quiz-question');
        if (qEl) qEl.innerText = 'لا يوجد سؤال سريري اليوم 🩺';
        const optsDiv = document.getElementById('quiz-options');
        if (optsDiv) optsDiv.innerHTML = '';
    }
}

async function fetchQuizzesList() {
    const list = document.getElementById('quizzes-list');
    if (!list) return;

    const { data, error } = await sb.from('daily_quiz').select('*').order('created_at', { ascending: false });
    if (error || !data) {
        list.innerHTML = '<p class="text-muted text-center">لا توجد كويزات حالياً</p>';
        return;
    }

    list.innerHTML = '';
    data.forEach(quiz => {
        const dateObj = new Date(quiz.created_at);
        const dateStr = dateObj.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
        
        const card = document.createElement('div');
        card.className = 'glass-card mb-3 slide-up';
        card.innerHTML = `
            <div class="quiz-badge mb-2"><i class="fa-solid fa-calendar-day"></i> ${dateStr}</div>
            <p style="font-weight: 700; margin-bottom: 1rem;">${quiz.question}</p>
            <div class="options">
                <div class="quiz-option" onclick="this.parentElement.classList.add('answered'); checkStaticAnswer(this, '${quiz.correct_option}', 'a', '${quiz.explanation}')">${quiz.option_a}</div>
                <div class="quiz-option" onclick="this.parentElement.classList.add('answered'); checkStaticAnswer(this, '${quiz.correct_option}', 'b', '${quiz.explanation}')">${quiz.option_b}</div>
                ${quiz.option_c ? `<div class="quiz-option" onclick="this.parentElement.classList.add('answered'); checkStaticAnswer(this, '${quiz.correct_option}', 'c', '${quiz.explanation}')">${quiz.option_c}</div>` : ''}
            </div>
            <div class="feedback mt-2" style="display: none;"></div>
        `;
        list.appendChild(card);
    });
}

function checkStaticAnswer(el, correctId, selectedId, explanation) {
    if (el.parentElement.classList.contains('locked')) return;
    el.parentElement.classList.add('locked');
    
    const feedback = el.parentElement.nextElementSibling;
    feedback.style.display = 'block';
    
    if (selectedId === correctId) {
        el.classList.add('correct');
        feedback.innerHTML = `<strong class="text-success"><i class="fa-solid fa-check"></i> إجابة صحيحة!</strong><div class="mt-1">${explanation || ''}</div>`;
    } else {
        el.classList.add('wrong');
        feedback.innerHTML = `<strong class="text-danger"><i class="fa-solid fa-times"></i> إجابة خاطئة!</strong><div class="mt-1 text-muted">${explanation || ''}</div>`;
        // Show correct answer
        Array.from(el.parentElement.children).forEach((child, idx) => {
            const charId = ['a', 'b', 'c'][idx];
            if (charId === correctId) child.classList.add('correct');
        });
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

// 2. Full Ads List
async function fetchAds() {
    const list = document.getElementById('announcements-list-full');
    if (!list) return;
    
    const { data } = await sb.from('ads').select('*').order('created_at', { ascending: false });
    
    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-muted text-center" style="padding:2rem">لا توجد تبليغات حالياً.</p>`;
        return;
    }

    list.innerHTML = '';
    data.forEach(ad => {
        const dateObj = new Date(ad.created_at);
        const dateStr = dateObj.toLocaleDateString('ar-IQ', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        list.innerHTML += `
            <div class="ad-card glass-card slide-up mb-2">
                <div class="ad-icon"><i class="fa-solid fa-bullhorn"></i></div>
                <div style="flex:1;">
                    <p style="font-size:1rem; font-weight:700; line-height:1.6; color: #fff;">${ad.content}</p>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.8rem; color: var(--primary); font-size:0.75rem; font-weight:600;">
                        <i class="fa-regular fa-calendar"></i> ${dateStr}
                    </div>
                </div>
            </div>
        `;
    });
}

// 3. Library (`lectures`)
async function fetchLibrary() {
    const list = document.getElementById('library-list');
    const tabsContainer = document.getElementById('library-tabs');
    if (!list) return;

    const { data, error } = await sb.from('lectures').select('*').order('created_at', { ascending: true });
    if (error || !data) {
        list.innerHTML = '<p class="text-muted text-center">لا توجد محاضرات حالياً</p>';
        return;
    }

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
        const card = document.createElement('div');
        card.className = `skill-card glass-card ${isCompleted ? 'completed' : ''}`;
        card.style.padding = '0.8rem';
        card.style.marginBottom = '0.5rem';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.cursor = 'pointer';
        card.onclick = () => toggleSkill(skill.id);
        
        card.innerHTML = `
            <div class="skill-info">
                <h4 style="font-size: 0.95rem; margin-bottom: 0.2rem;">${skill.title}</h4>
                <p style="font-size: 0.8rem; color: var(--text-muted);">${skill.desc}</p>
            </div>
            <div class="skill-checkbox" style="width:24px; height:24px; border:2px solid ${isCompleted ? 'var(--success)' : 'var(--glass-border)'}; border-radius:6px; display:flex; justify-content:center; align-items:center;">
                <i class="fa-solid fa-check" style="${isCompleted ? 'display:block; color:var(--success)' : 'display:none'}"></i>
            </div>
        `;
        list.appendChild(card);
    });
}

function toggleSkill(id) {
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
    // Only fetch approved requests for regular users
    const query = sb.from('study_requests').select('*');
    if (!state.isAdmin) {
        query.eq('is_approved', true);
    }
    const { data } = await query.order('created_at', { ascending: false });
    const list = document.getElementById('buddy-list');
    if (!list) return;
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
                            <h4>${b.full_name || 'طالب مجهول'} ${isMe ? '<i class="fa-solid fa-crown text-warning"></i>' : ''}</h4>
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
        is_approved: false // Now pending admin approval
    }]);

    if (error) {
        showToast('حدث خطأ بالاتصال، جرب مرة أخرى.', 'error');
    } else {
        document.getElementById('buddy-modal').style.display = 'none';
        document.getElementById('buddy-subject').value = '';
        document.getElementById('buddy-tele').value = '';
        document.getElementById('buddy-details').value = '';
        showToast('تم إرسال طلبك للمراجعة من قبل الإدارة.', 'info');
    }
}

// 8. Weekly Schedule (`schedule`)
async function fetchSchedule() {
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    const activePill = document.querySelector('#schedule-tabs .tab-pill.active');
    const filterDay = activePill ? activePill.innerText : days[0];

    filterSchedule(filterDay);
}

// Function to refresh all data
async function refreshAllData() {
    if (state.user) {
        await loadSupabaseData();
    }
}

async function filterSchedule(day, el) {
    if (el) {
        document.querySelectorAll('#schedule-tabs .tab-pill').forEach(b => b.classList.remove('active'));
        el.classList.add('active');
    } else {
        // Find corresponding button to set active if no el passed
        document.querySelectorAll('#schedule-tabs .tab-pill').forEach(b => {
            if (b.innerText.trim() === day) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    }

    const { data, error } = await sb.from('schedule').select('*').eq('day', day).order('created_at', { ascending: true });
    // In Supabase if no matching column it might return empty array. We fall back safely.
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
        <div class="glass-card slide-up mb-3" style="border-radius: 20px;">
            <h3 style="margin-bottom:1rem; font-size:1rem; border-bottom:1px solid var(--glass-border); padding-bottom:0.5rem; color: var(--primary);">
                <i class="fa-solid fa-calendar-day"></i> جدول يوم ${day}
            </h3>
            <div class="schedule-horizontal-row">
                ${data.map((s, idx) => `
                    <div class="schedule-item">
                        <span class="lecture-badge">محاضرة ${idx + 1}</span>
                        <h4 class="subject-name">${s.subject}</h4>
                        <div class="lecture-meta">
                            <span><i class="fa-regular fa-clock"></i> ${s.time}</span>
                            <span><i class="fa-solid fa-location-dot"></i> ${s.hall}</span>
                        </div>
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
        showToast('تم تعزيز الهوية السريرية في الحساب.', 'success');
    }
}

// 10. Admin Logic
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-panel-section').forEach(s => s.style.display = 'none');
    const el = document.getElementById(`admin-${tab}`);
    if (el) el.style.display = 'block';

    if (tab === 'users') fetchUsers();
    if (tab === 'announcement') fetchAdminAds();
    if (tab === 'library-add') fetchAdminLibrary();
    if (tab === 'schedule-add') fetchAdminSchedule();
    if (tab === 'quiz-add') fetchAdminQuizzes();
    if (tab === 'buddy-mgr') fetchAdminBuddies();
}

async function fetchAdminAds() {
    const list = document.getElementById('admin-ads-list');
    if (!list) return;
    const { data } = await sb.from('ads').select('*').order('created_at', { ascending: false });
    list.innerHTML = '';
    data?.forEach(ad => {
        list.innerHTML += `
            <div class="admin-item-row">
                <div class="admin-item-info">
                   <h4>${ad.content}</h4>
                   <span>إعلان عام</span>
                </div>
                <button class="action-btn text-danger" onclick="deleteItem('ads', '${ad.id}', fetchAdminAds)"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

async function fetchAdminLibrary() {
    const list = document.getElementById('admin-lib-manage-list');
    if (!list) return;
    const { data } = await sb.from('lectures').select('*').order('created_at', { ascending: false });
    list.innerHTML = '';
    data?.forEach(lec => {
        list.innerHTML += `
            <div class="admin-item-row">
                <div class="admin-item-info">
                   <h4>${lec.title}</h4>
                   <span>القسم: ${lec.subject_type}</span>
                </div>
                <button class="action-btn text-danger" onclick="deleteItem('lectures', '${lec.id}', fetchAdminLibrary)"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

async function fetchAdminSchedule() {
    const list = document.getElementById('admin-sched-manage-list');
    if (!list) return;
    const { data } = await sb.from('schedule').select('*').order('day', { ascending: true });
    list.innerHTML = '';
    data?.forEach(s => {
        list.innerHTML += `
            <div class="admin-item-row">
                <div class="admin-item-info">
                   <h4>${s.subject}</h4>
                   <span>اليوم: ${s.day} | الوقت: ${s.time}</span>
                </div>
                <button class="action-btn text-danger" onclick="deleteItem('schedule', '${s.id}', fetchAdminSchedule)"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

async function fetchAdminQuizzes() {
    const list = document.getElementById('admin-quiz-manage-list');
    if (!list) return;
    const { data } = await sb.from('daily_quiz').select('*').order('created_at', { ascending: false });
    list.innerHTML = '';
    data?.forEach(q => {
        list.innerHTML += `
            <div class="admin-item-row">
                <div class="admin-item-info">
                   <h4>${q.question}</h4>
                   <span>سؤال اليوم</span>
                </div>
                <button class="action-btn text-danger" onclick="deleteItem('daily_quiz', '${q.id}', fetchAdminQuizzes)"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
}

async function fetchAdminBuddies() {
    const pendingList = document.getElementById('admin-buddy-pending');
    const approvedList = document.getElementById('admin-buddy-approved');
    if (!pendingList || !approvedList) return;

    const { data } = await sb.from('study_requests').select('*').order('created_at', { ascending: false });
    pendingList.innerHTML = '';
    approvedList.innerHTML = '';

    data?.forEach(b => {
        const html = `
            <div class="admin-item-row" style="flex-direction:column; align-items:flex-start;">
                <div class="m-1"><strong>${b.full_name || 'طالب'} - ${b.subject || 'غير محدد'}</strong></div>
                <div class="text-muted m-1" style="font-size:0.65rem;">${b.details || 'لا توجد تفاصيل'}</div>
                <div style="display:flex; gap:0.5rem; width:100%; margin-top:0.5rem;">
                    ${!b.is_approved ? `<button class="btn success-btn" style="padding:0.4rem; font-size:0.7rem; flex:1;" onclick="approveBuddy('${b.id}')">موافقة</button>` : ''}
                    <button class="btn danger-btn" style="padding:0.4rem; font-size:0.7rem; ${b.is_approved ? 'flex:1' : 'width:30%'}" onclick="deleteItem('study_requests', '${b.id}', fetchAdminBuddies)">حذف</button>
                </div>
            </div>
        `;
        if (b.is_approved) approvedList.innerHTML += html;
        else pendingList.innerHTML += html;
    });
}

async function approveBuddy(id) {
    const { error } = await sb.from('study_requests').update({ is_approved: true }).eq('id', id);
    if (!error) {
        showToast('تمت الموافقة على الطلب ونشره.', 'success');
        fetchAdminBuddies();
    }
}

async function deleteItem(table, id, callback) {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر نهائياً؟')) return;
    const { error } = await sb.from(table).delete().eq('id', id);
    if (error) showToast('فشل في الحذف', 'error');
    else {
        showToast('تم الحذف بنجاح', 'success');
        if (callback) callback();
   }
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
            <div class="glass-card" style="padding: 1rem; border-radius: 12px; display:flex; align-items:center; gap:1rem; position:relative;">
                <img src="${u.avatar || ''}" style="width:50px; height:50px; border-radius:50%; background:var(--glass-bg);">
                <div style="flex:1;">
                    <h4 style="font-size:0.95rem; margin-bottom:0.2rem;">${u.full_name}</h4>
                    <p style="font-size:0.75rem; color:var(--text-muted);">
                        المرحلة: ${u.stage || 'غير محدد'} | الشعبة: ${u.study_group || 'غير محدد'} | الجنس: ${u.gender === 'male' ? 'ذكر' : 'أنثى'}
                    </p>
                    ${u.telegram ? `<a href="https://t.me/${u.telegram.replace('@', '')}" target="_blank" style="font-size:0.75rem; color:var(--primary); text-decoration:none;"><i class="fa-brands fa-telegram"></i> ${u.telegram}</a>` : ''}
                </div>
                <button class="action-btn text-danger" style="position:absolute; left:1rem; top:1rem;" onclick="deleteItem('profiles', '${u.id}', fetchUsers)">
                    <i class="fa-solid fa-user-minus"></i>
                </button>
            </div>
        `;
    });
}

async function addAd() {
    const content = document.getElementById('admin-ad-content').value;
    if (!content) return showToast('هيكل التعميم فارغ!', 'error');

    const { error } = await sb.from('ads').insert([{ content }]);
    if (error) showToast('فشل في إرسال الإعلان.', 'error');
    else {
        showToast('تم تعميم الإعلان بنجاح!', 'success');
        document.getElementById('admin-ad-content').value = '';
        fetchLatestAd();
        fetchAdminAds();
    }
}

async function addLibraryItem() {
    const title = document.getElementById('admin-lib-title').value;
    const link = document.getElementById('admin-lib-link').value;
    const subject_type = document.getElementById('admin-lib-type').value;

    if (!title || !link || !subject_type) return showToast('رابط وملف المصدر ضروري للمكتبة', 'error');

    const { error } = await sb.from('lectures').insert([{ title, link, subject_type }]);
    if (error) showToast('فشل التوثيق بسبب عطل بالخادم', 'error');
    else {
        showToast('صعد الكتاب للمكتبة بنجاح!', 'success');
        document.getElementById('admin-lib-title').value = '';
        document.getElementById('admin-lib-link').value = '';
        document.getElementById('admin-lib-type').value = '';
        fetchLibrary();
        fetchAdminLibrary();
    }
}

async function addDailyQuiz() {
    const question = document.getElementById('admin-quiz-q').value;
    const option_a = document.getElementById('admin-quiz-oa').value;
    const option_b = document.getElementById('admin-quiz-ob').value;
    const option_c = document.getElementById('admin-quiz-oc').value;
    const correct_option = document.getElementById('admin-quiz-ans').value;
    const explanation = document.getElementById('admin-quiz-exp').value;

    if (!question || !option_a || !option_b || !option_c) return showToast('الاستمارة تحتاج نص وأجوبة لتتأكد من إرسال سؤال طبي مكتمل.', 'error');

    const { error } = await sb.from('daily_quiz').insert([{
        question, option_a, option_b, option_c,
        correct_option, explanation
    }]);

    if (error) showToast('حدث خلل ما في السند للبيانات.', 'error');
    else {
        showToast('تم تدشين السؤال الحصري اليومي!', 'success');
        document.getElementById('admin-quiz-q').value = '';
        document.getElementById('admin-quiz-oa').value = '';
        document.getElementById('admin-quiz-ob').value = '';
        document.getElementById('admin-quiz-oc').value = '';
        document.getElementById('admin-quiz-exp').value = '';
        fetchQuiz();
        fetchAdminQuizzes();
    }
}

async function addScheduleItem() {
    const btn = event?.target || document.querySelector('#admin-schedule-add .primary-btn');
    const day = document.getElementById('admin-sched-day').value;
    const subject = document.getElementById('admin-sched-subject').value;
    const time = document.getElementById('admin-sched-time').value;
    const hall = document.getElementById('admin-sched-hall').value;

    if (!subject || !time || !hall) return showToast('يرجى ملء جميع البيانات.', 'error');

    // 1. تفعيل حالة التحميل وتعطيل الزر لمنع التجمد
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإضافة...';

    try {
        const { error } = await sb.from('schedule').insert([{ day, subject, time, hall }]);

        if (error) {
            showToast('حدث خطأ في قاعدة البيانات: ' + error.message, 'error');
        } else {
            showToast('تمت إضافة المحاضرة بنجاح!', 'success');

            // 2. تصفير الحقول
            document.getElementById('admin-sched-subject').value = '';
            document.getElementById('admin-sched-time').value = '';
            document.getElementById('admin-sched-hall').value = '';

            // 3. تحديث البيانات (تأكد من وجود هذه الوظائف)
            if (typeof fetchSchedule === "function") await fetchSchedule();
            if (typeof fetchAdminSchedule === "function") await fetchAdminSchedule();
        }
    } catch (err) {
        console.error("Critical Error:", err);
        showToast('حدث خطأ غير متوقع في النظام.', 'error');
    } finally {
        // 4. إعادة الزر لحالته الطبيعية
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- AI Buddy & Groq API Integration ---

async function handlePDFUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    const statusBar = document.getElementById('pdf-status-bar');
    const listNames = document.getElementById('pdf-list-names');

    statusBar.style.display = 'flex';
    listNames.innerHTML = '<span class="text-primary" style="font-size:0.7rem;">جاري استخراج النصوص... <i class="fa-solid fa-spinner fa-spin"></i></span>';

    for (let f of files) {
        if (!f.name.toLowerCase().endsWith('.pdf')) {
            showToast(`الملف ${f.name} غير مدعوم. يرجى رفع ملفات PDF فقط.`, 'error');
            continue;
        }
        try {
            const arrayBuffer = await f.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = `[المصدر: ${f.name}]\n`;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + "\n";
            }
            state.ai.pdfTexts.push(fullText);
            document.getElementById('ai-welcome-msg').style.display = 'none';
            const chatWin = document.getElementById('chat-window');
            chatWin.style.display = 'flex';
            chatWin.classList.remove('empty-state');
            renderPDFTags();
        } catch (err) {
            console.error('PDF Error:', err);
            showToast(`فشل قراءة ${f.name}`, 'error');
        }
    }
}

function renderPDFTags() {
    const listNames = document.getElementById('pdf-list-names');
    listNames.innerHTML = state.ai.pdfTexts.map((txt, idx) => {
        const name = txt.match(/\[المصدر: (.*?)\]/)?.[1] || `ملف ${idx + 1}`;
        return `
            <div class="action-mini-btn" style="background:var(--primary-glow); color:var(--primary); white-space:nowrap;">
                <i class="fa-solid fa-file-pdf"></i> ${name.substring(0, 10)}...
            </div>
        `;
    }).join('');
}

function clearPDFs() {
    state.ai.pdfTexts = [];
    document.getElementById('pdf-status-bar').style.display = 'none';
    showToast('تم إفراغ المحاضرات المرفوعة', 'info');
}

function handlePDFManualTrigger() {
    document.getElementById('pdf-upload-input').click();
}

function autoResizeTextarea(el) {
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, 120);
    el.style.height = newHeight + 'px';
    
    // Adjust the dock position if needed, though 'fixed' should handle most cases
    const dock = el.closest('.ai-input-dock');
    if (dock) {
        // Ensure the dock doesn't jump
        dock.style.transition = 'none';
    }
}

function handleChatAction() {
    if (state.ai.controller) {
        state.ai.controller.abort();
        state.ai.controller = null;
        setChatLoading(false);
        showToast('تم إيقاف التوليد', 'info');
    } else {
        const chatWin = document.getElementById('chat-window');
        const welcomeMsg = document.getElementById('ai-welcome-msg');
        if (welcomeMsg) welcomeMsg.style.display = 'none';
        if (chatWin) chatWin.style.display = 'flex';
        sendMessageToAI();
    }
}

function setChatLoading(loading) {
    const btn = document.getElementById('send-ai-btn');
    const sendIcon = document.getElementById('send-icon');
    const stopIcon = document.getElementById('stop-icon');

    if (loading) {
        btn.classList.add('stopping');
        sendIcon.style.display = 'none';
        stopIcon.style.display = 'block';
    } else {
        btn.classList.remove('stopping');
        sendIcon.style.display = 'block';
        stopIcon.style.display = 'none';
    }
}

async function sendMessageToAI(customPrompt = null) {
    const inputEl = document.getElementById('ai-chat-input');
    const question = customPrompt || (inputEl ? inputEl.value.trim() : null);

    if (!question) return;

    // 1. إدارة الإلغاء بشكل آمن لمنع تداخل الطلبات
    if (state.ai.controller) {
        state.ai.controller.abort();
    }
    state.ai.controller = new AbortController();

    if (!customPrompt && inputEl) {
        state.ai.lastQuestion = question;
        appendChatBubble("user", question);
        inputEl.value = "";
        if (typeof autoResizeTextarea === 'function') autoResizeTextarea(inputEl);
    }

    setChatLoading(true);
    const aiBubble = appendChatBubble("ai", `<i class="fa-solid fa-ellipsis fa-fade"></i> جاري التحليل...`);

    const fullContext = state.ai.pdfTexts.join("\n\n").slice(0, 5000); // تحديد طول النص لمنع الانهيار

    // System Prompt المطور (بالإنجليزي لإجبار الدقة)
    const systemPrompt = `You are a Nursing Academic Expert.
    STRICT RULES:
    1. Language: Follow the lecture language.
    2. Format: You MUST use this interleaved bilingual style for explanations and questions:
       - [English Text]
       ..... [Arabic Translation]
    3. Formatting: 
       - Medical terms must be: <span style="color: #0ea5e9;">**Term**</span>
       - Titles must start with ###.
    4. Context:
    ${fullContext}`;

    const messages = [
        { role: "system", content: systemPrompt },
        ...state.ai.history.slice(-2), // نرسل آخر 6 رسائل فقط لتجنب أخطاء الـ API
        { role: "user", content: question }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            signal: state.ai.controller.signal,
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: messages,
                temperature: 0.6,
                max_tokens: 2000
            })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const answer = data.choices[0].message.content;

        aiBubble.innerHTML = `
            <div class="bubble-content">${marked.parse(answer)}</div>
            <div class="chat-actions">
                <button class="copy-msg-btn-mini" onclick="copyToClipboard(this)">
                    <i class="fa-solid fa-copy"></i> نسخ
                </button>
            </div>
        `;

        state.ai.history.push({ role: 'user', content: question });
        state.ai.history.push({ role: 'assistant', content: answer });

    } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Chat Error:", err);
        aiBubble.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> عذراً، حدث خطأ في الاتصال بالانترنت. حاول تقليل حجم الطلب أو تحديث الصفحة.`;
    } finally {
        setChatLoading(false);
        state.ai.controller = null;
    }
}


function appendChatBubble(role, content) {
    const chatWin = document.getElementById("chat-window");
    if (!chatWin) return;
    
    const div = document.createElement("div");
    div.className = `chat-bubble ${role}`;
    
    if (role === "ai") {
        const bubbleContent = document.createElement("div");
        bubbleContent.className = "bubble-content";
        bubbleContent.innerHTML = (window.marked ? marked.parse(content) : content);
        div.appendChild(bubbleContent);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "chat-actions";
        
        const copyBtn = document.createElement("button");
        copyBtn.className = "copy-msg-btn-mini";
        copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i> نسخ`;
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(bubbleContent.innerText).then(() => {
                showToast("تم النسخ بنجاح", "success");
            });
        };
        actionsDiv.appendChild(copyBtn);
        div.appendChild(actionsDiv);
    } else {
        div.innerText = content;
    }
    
    chatWin.appendChild(div);
    setTimeout(() => {
        chatWin.scrollTo({ top: chatWin.scrollHeight, behavior: "smooth" });
    }, 50);
    return div;
}

function formatAIResponse(text) {
    return (window.marked ? marked.parse(text) : text);
}

    
function newChat() {
    state.ai.history = [];
    const chatWin = document.getElementById('chat-window');
    chatWin.innerHTML = '';
    chatWin.classList.add('empty-state');
    chatWin.style.display = 'none';
    const welcomeMsg = document.getElementById('ai-welcome-msg');
    if (welcomeMsg) welcomeMsg.style.display = 'flex';
    
    showToast('تم بدء محادثة جديدة بنجاح', 'info');
}


function startAIQuiz() {
    if (state.ai.pdfTexts.length === 0) {
        return showToast('ارفع محاضراتك أولاً لنتمكن من اختبارك فيها! 🧪', 'info');
    }

    // أمر محدد جداً لإجبار النموذج على التنسيق سطر بسطر
    const quizPrompt = `Generate 5 MCQs based on the lectures. 
    IMPORTANT: You must use the following strictly interleaved bilingual format for EVERY question and EVERY option:

    - [The text in English]
    ..... [الترجمة أو الشرح بالعربي]

    Structure example:
    Question 1:
    - What is the normal range for adult heart rate?
    ..... ما هو النطاق الطبيعي لمعدل ضربات قلب البالغين؟

    A) - 60-100 bpm
    ..... 60-100 نبضة في الدقيقة

    (Apply this to all questions and options. Finally, provide the correct answers in a table at the end.)`;

    sendMessageToAI(quizPrompt);
}


function copyToClipboard(btn) {
    const bubble = btn.closest('.chat-bubble');
    const text = bubble.querySelector('.bubble-content').innerText;
    navigator.clipboard.writeText(text).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
    });
}


// دالة إعداد تطبيق الويب التقدمي (PWA)
function setupPWA() {
    // 1. تسجيل الـ Service Worker للعمل بدون إنترنت وللتثبيت
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('✅ PWA: Service Worker مسجل بنجاح'))
                .catch(err => console.log('❌ PWA: فشل تسجيل Service Worker', err));
        });
    }

    // 2. معالجة ظهور زر التثبيت (اختياري إذا أردت إظهار زر مخصص)
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // منع المتصفح من إظهار التنبيه التلقائي فوراً
        e.preventDefault();
        deferredPrompt = e;
        console.log('✅ التطبيق جاهز للتثبيت على الهاتف');

        // هنا يمكنك إظهار زر "تثبيت التطبيق" للمستخدم إذا أردت
    });

    // 3. التأكد من أن التطبيق يعمل بملء الشاشة عند فتحه من الأيقونة
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('📱 يتم التشغيل الآن كـ تطبيق مثبت');
    }
}

// استدعاء الدالة عند تشغيل الموقع
setupPWA();
 