import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// TODO: Insert your URL and ANON KEY here
const supabase = createClient('YOUR_URL', 'YOUR_KEY');
let globalStandardAmount = 3.00;

// ==============================
// 1. USER PORTAL LOGIC
// ==============================
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) {
  let currentUser = null;

  loginBtn.addEventListener('click', async () => {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('userpass').value;
    
    let query = supabase.from('members').select('id, full_name, password').eq('username', user).single();
    const { data: member, error } = await query;

    if (error || !member || (member.password && member.password !== pass)) {
      alert('Invalid Username or Password');
      return;
    }

    currentUser = member;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('welcome-name').innerText = member.full_name;
    loadUserGrid(member.id, document.getElementById('year-filter').value);
  });

  document.getElementById('year-filter').addEventListener('change', (e) => {
    if(currentUser) loadUserGrid(currentUser.id, e.target.value);
  });

  async function loadUserGrid(memberId, year) {
    const { data: contributions } = await supabase
      .from('contributions').select('month').eq('member_id', memberId).eq('year', year);
    
    const paidMonths = contributions ? contributions.map(c => c.month) : [];
    const grid = document.getElementById('months-grid');
    grid.innerHTML = '';
    
    const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    mNames.forEach((name, idx) => {
      const isPaid = paidMonths.includes(idx + 1);
      grid.innerHTML += `<div class="month-card ${isPaid ? 'paid' : 'unpaid'}">${name}<br>${isPaid ? 'Paid' : 'Pending'}</div>`;
    });
  }
}

// ==============================
// 2. ADMIN PORTAL LOGIC
// ==============================
const adminLoginBtn = document.getElementById('adminLoginBtn');
if (adminLoginBtn) {
  
  // -- Admin Auth --
  adminLoginBtn.addEventListener('click', async () => {
    const user = document.getElementById('admin-username').value;
    const pass = document.getElementById('admin-password').value;
    const { data } = await supabase.from('admins').select('*').eq('username', user).eq('password', pass).single();
    if (data) {
      document.getElementById('admin-login-section').style.display = 'none';
      document.getElementById('admin-main-section').style.display = 'block';
      initAdminPanel();
    } else {
      alert('Admin credentials incorrect');
    }
  });

  async function initAdminPanel() {
    // Load Global Settings
    const { data: settings } = await supabase.from('settings').select('standard_amount').limit(1).single();
    if (settings) {
      globalStandardAmount = settings.standard_amount;
      document.getElementById('paymentAmount').value = globalStandardAmount;
      document.getElementById('globalAmountInput').value = globalStandardAmount;
    }

    // Load Groups for Dropdowns
    const { data: groups } = await supabase.from('groups').select('*');
    ['groupSelect', 'newMemberGroup'].forEach(id => {
      const select = document.getElementById(id);
      groups.forEach(g => select.innerHTML += `<option value="${g.id}">${g.leader_name}</option>`);
    });

    // Load Members for Edit Setting Dropdown
    const { data: members } = await supabase.from('members').select('*');
    const editSelect = document.getElementById('editMemberSelect');
    members.forEach(m => editSelect.innerHTML += `<option value="${m.id}">${m.full_name} (@${m.username})</option>`);
  }

  // -- Dependent Dropdown (Groups -> Members) --
  document.getElementById('groupSelect').addEventListener('change', async (e) => {
    const { data: members } = await supabase.from('members').select('*').eq('group_id', e.target.value);
    const mSelect = document.getElementById('memberSelect');
    mSelect.innerHTML = '<option value="">2. Select Member</option>';
    members.forEach(m => mSelect.innerHTML += `<option value="${m.id}">${m.full_name}</option>`);
  });

  // -- Payment Type Logic (Standard vs Other) --
  document.getElementById('paymentType').addEventListener('change', (e) => {
    const amtInput = document.getElementById('paymentAmount');
    if(e.target.value === 'Standard') {
      amtInput.value = globalStandardAmount;
      amtInput.readOnly = true;
    } else {
      amtInput.value = '';
      amtInput.readOnly = false;
    }
  });

  // -- Log Payment Submit --
  document.getElementById('submitPaymentBtn').addEventListener('click', async () => {
    const data = {
      member_id: document.getElementById('memberSelect').value,
      year: document.getElementById('paymentYear').value,
      month: document.getElementById('paymentMonth').value,
      amount: document.getElementById('paymentAmount').value,
      payment_type: document.getElementById('paymentType').value,
      notes: document.getElementById('paymentNotes').value
    };
    if(!data.member_id || !data.amount) return alert("Fill required fields");
    
    const { error } = await supabase.from('contributions').insert([data]);
    alert(error ? error.message : "Payment Saved!");
  });

  // -- Add Users Logic --
  document.getElementById('createLeaderBtn').addEventListener('click', async () => {
    const name = document.getElementById('newLeaderName').value;
    const phone = document.getElementById('newLeaderPhone').value;
    if(!name || !phone) return alert("Leader name and phone required");
    const { error } = await supabase.from('groups').insert([{ leader_name: name, phone }]);
    alert(error ? error.message : "Group Leader Created! Refresh to see.");
  });

  document.getElementById('createMemberBtn').addEventListener('click', async () => {
    const data = {
      group_id: document.getElementById('newMemberGroup').value,
      full_name: document.getElementById('newMemberName').value,
      username: document.getElementById('newMemberUsername').value,
      password: document.getElementById('newMemberPass').value,
      phone: document.getElementById('newMemberPhone').value
    };
    if(!data.group_id || !data.username) return alert("Group and Username required");
    const { error } = await supabase.from('members').insert([data]);
    alert(error ? error.message : "Member Created!");
  });

  // -- Settings Update Logic --
  document.getElementById('saveGlobalBtn').addEventListener('click', async () => {
    const newAmt = document.getElementById('globalAmountInput').value;
    const { error } = await supabase.from('settings').update({ standard_amount: newAmt }).eq('id', 1);
    if(!error) {
       globalStandardAmount = newAmt;
       document.getElementById('paymentAmount').value = newAmt;
       alert("Global Amount Updated");
    }
  });

  document.getElementById('editMemberSelect').addEventListener('change', async (e) => {
    const { data } = await supabase.from('members').select('*').eq('id', e.target.value).single();
    if(data) {
      document.getElementById('editName').value = data.full_name;
      document.getElementById('editUsername').value = data.username;
      document.getElementById('editPassword').value = data.password;
    }
  });

  document.getElementById('saveUserEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('editMemberSelect').value;
    const updates = {
      full_name: document.getElementById('editName').value,
      username: document.getElementById('editUsername').value,
      password: document.getElementById('editPassword').value
    };
    const { error } = await supabase.from('members').update(updates).eq('id', id);
    alert(error ? error.message : "User Updated Successfully!");
  });
}