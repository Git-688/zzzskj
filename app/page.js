'use client';
import { useEffect, useState, useRef } from 'react';

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [links, setLinks] = useState([]);
  const [activePrimary, setActivePrimary] = useState('');
  const [activeSecondary, setActiveSecondary] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [toast, setToast] = useState({ show: false, text: '', type: 'success' });
  const [isAdmin, setIsAdmin] = useState(false);
  const [expireAt, setExpireAt] = useState(null);
  const [isForever, setIsForever] = useState(false);

  // 后台管理
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('primary');
  const [adminPrimaryId, setAdminPrimaryId] = useState('');
  const [adminSecondaryId, setAdminSecondaryId] = useState('');

  // 自定义下拉
  const [showAdminPrimarySelect, setShowAdminPrimarySelect] = useState(false);
  const [showLinkPrimarySelect, setShowLinkPrimarySelect] = useState(false);
  const [showLinkSecondarySelect, setShowLinkSecondarySelect] = useState(false);
  const [showDurationSelect, setShowDurationSelect] = useState(false);
  const adminPrimarySelectRef = useRef(null);
  const linkPrimarySelectRef = useRef(null);
  const linkSecondarySelectRef = useRef(null);
  const durationSelectRef = useRef(null);

  // 编辑模态框
  const [editModalType, setEditModalType] = useState('');
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', sort: '', title: '', url: '', desc: '' });

  // 临时密码模态框
  const [showTempModal, setShowTempModal] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(3600);
  const [tempHistory, setTempHistory] = useState([]);

  // 有效期选项
  const durationOptions = [
    { label: '5分钟', value: 5 * 60 },
    { label: '10分钟', value: 10 * 60 },
    { label: '15分钟', value: 15 * 60 },
    { label: '20分钟', value: 20 * 60 },
    { label: '25分钟', value: 25 * 60 },
    { label: '30分钟', value: 30 * 60 },
    { label: '1小时', value: 60 * 60 },
    { label: '12小时', value: 12 * 60 * 60 },
    { label: '24小时', value: 24 * 60 * 60 },
    { label: '7天', value: 7 * 24 * 60 * 60 },
    { label: '15天', value: 15 * 24 * 60 * 60 },
    { label: '30天', value: 30 * 24 * 60 * 60 },
    { label: '180天', value: 180 * 24 * 60 * 60 },
    { label: '360天', value: 360 * 24 * 60 * 60 },
    { label: '永久', value: -1 },
  ];

  // 提取域名用于favicon
  const getHostname = (url) => {
    try { return new URL(url).hostname; } catch { return ''; }
  };

  // 统计分类下的链接数量
  const getLinkCountByCategory = (categoryId) => {
    return links.filter(l => l.categoryId === categoryId).length;
  };

  // favicon加载失败自动降级备用源
  const handleFaviconError = (e) => {
    const img = e.target;
    if (!img.dataset.retried) {
      img.dataset.retried = '1';
      const domain = getHostname(img.dataset.url || '');
      if (domain) {
        img.src = `https://favicon.im/${domain}`;
      } else {
        img.style.display = 'none';
      }
    } else {
      img.style.display = 'none';
    }
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  // 格式化剩余有效期
  const formatRemainTime = (expireTimestamp) => {
    if (!expireTimestamp) return '永久有效';
    const remain = expireTimestamp - Date.now();
    if (remain <= 0) return '即将过期';
    
    const days = Math.floor(remain / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remain % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remain % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分`;
    return `${minutes}分钟`;
  };

  // 加载基础数据（带本地缓存）
  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      const data = await res.json();
      setCategories(data.categories);
      setLinks(data.links);
      
      // 写入本地缓存
      localStorage.setItem('nav:data', JSON.stringify(data));
      
      const visiblePrimary = data.categories.filter(c => !c.parentId && c.visible !== false);
      if (visiblePrimary.length > 0 && !activePrimary) {
        setActivePrimary(visiblePrimary[0].id);
        setAdminPrimaryId(data.categories.filter(c => !c.parentId)[0]?.id || '');
      }
    } catch (e) {
      // 网络失败时使用本地缓存，已在初始化中处理
    }
  };

  // 校验管理员身份与有效期
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setIsAdmin(data.isAdmin);
      setExpireAt(data.expireAt || null);
      setIsForever(data.isForever || false);
    } catch (e) {}
  };

  // 初始化：先读本地缓存秒开，再拉取最新数据
  useEffect(() => {
    const cached = localStorage.getItem('nav:data');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setCategories(data.categories);
        setLinks(data.links);
        const visiblePrimary = data.categories.filter(c => !c.parentId && c.visible !== false);
        if (visiblePrimary.length > 0) {
          setActivePrimary(visiblePrimary[0].id);
        }
      } catch (e) {}
    }
    loadData();
    checkAuth();
  }, []);

  useEffect(() => {
    if (!activePrimary) return;
    const visibleSecondary = categories.filter(c => c.parentId === activePrimary && c.visible !== false);
    setActiveSecondary(visibleSecondary.length > 0 ? visibleSecondary[0].id : '');
  }, [activePrimary, categories]);

  useEffect(() => {
    if (!adminPrimaryId) return;
    const secondaryCats = categories.filter(c => c.parentId === adminPrimaryId);
    setAdminSecondaryId(secondaryCats.length > 0 ? secondaryCats[0].id : '');
  }, [adminPrimaryId, categories]);

  // 点击外部关闭所有下拉
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adminPrimarySelectRef.current && !adminPrimarySelectRef.current.contains(e.target)) {
        setShowAdminPrimarySelect(false);
      }
      if (linkPrimarySelectRef.current && !linkPrimarySelectRef.current.contains(e.target)) {
        setShowLinkPrimarySelect(false);
      }
      if (linkSecondarySelectRef.current && !linkSecondarySelectRef.current.contains(e.target)) {
        setShowLinkSecondarySelect(false);
      }
      if (durationSelectRef.current && !durationSelectRef.current.contains(e.target)) {
        setShowDurationSelect(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (text, type = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => setToast({ show: false, text: '', type: 'success' }), 2000);
  };

  // 切换分类显示状态
  const toggleCategoryVisible = async (cat) => {
    await fetch('/api/categories', {
      method: 'PUT',
      body: JSON.stringify({ 
        id: cat.id, 
        name: cat.name, 
        sort: cat.sort, 
        visible: !cat.visible 
      })
    });
    await loadData();
    showToast(cat.visible ? '已隐藏分类' : '已显示分类');
  };

  // 加载临时密码历史
  const loadTempHistory = async () => {
    const res = await fetch('/api/temp-password');
    if (res.ok) {
      const data = await res.json();
      setTempHistory(data);
    }
  };

  // 生成临时密码
  const generateTempPassword = async () => {
    try {
      const res = await fetch('/api/temp-password', {
        method: 'POST',
        body: JSON.stringify({ durationSeconds: selectedDuration })
      });
      if (res.ok) {
        showToast('临时密码生成成功');
        loadTempHistory();
      } else {
        showToast('生成失败', 'error');
      }
    } catch {
      showToast('生成失败', 'error');
    }
  };

  // 吊销临时密码
  const revokeTempPassword = async (password) => {
    if (!confirm('确认吊销该临时密码？吊销后立即失效')) return;
    try {
      const res = await fetch(`/api/temp-password?password=${password}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('密码已吊销');
        loadTempHistory();
      } else {
        showToast('吊销失败', 'error');
      }
    } catch {
      showToast('吊销失败', 'error');
    }
  };

  // 复制密码
  const copyPassword = async (pwd) => {
    await navigator.clipboard.writeText(pwd);
    showToast('密码已复制到剪贴板');
  };

  // 打开添加模态框
  const openAddModal = (type) => {
    let nextSort = 1;
    if (type === 'addPrimary') {
      const siblings = categories.filter(c => !c.parentId);
      nextSort = siblings.length > 0 ? Math.max(...siblings.map(c => c.sort || 0)) + 1 : 1;
    }
    if (type === 'addSecondary') {
      const siblings = categories.filter(c => c.parentId === adminPrimaryId);
      nextSort = siblings.length > 0 ? Math.max(...siblings.map(c => c.sort || 0)) + 1 : 1;
    }
    if (type === 'addLink') {
      const siblings = links.filter(l => l.categoryId === adminSecondaryId);
      nextSort = siblings.length > 0 ? Math.max(...siblings.map(l => l.sort || 0)) + 1 : 1;
    }
    setFormData({ name: '', sort: nextSort, title: '', url: '', desc: '' });
    setEditModalType(type);
  };

  // 打开编辑模态框
  const openEditModal = (type, item) => {
    setCurrentItem(item);
    if (type.startsWith('primary') || type.startsWith('secondary')) {
      setFormData({ name: item.name, sort: item.sort, title: '', url: '', desc: '' });
    }
    if (type.startsWith('link')) {
      setFormData({ name: item.title, sort: item.sort, title: item.title, url: item.url, desc: item.desc || '' });
    }
    setEditModalType(type);
  };

  const closeEditModal = () => {
    setEditModalType('');
    setCurrentItem(null);
  };

  // 提交添加/编辑（支持表单回车提交）
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editModalType === 'addPrimary') {
        res = await fetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, parentId: null, sort: formData.sort })
        });
      }
      if (editModalType === 'editPrimary') {
        res = await fetch('/api/categories', {
          method: 'PUT',
          body: JSON.stringify({ id: currentItem.id, name: formData.name, sort: formData.sort })
        });
      }
      if (editModalType === 'addSecondary') {
        res = await fetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: formData.name, parentId: adminPrimaryId, sort: formData.sort })
        });
      }
      if (editModalType === 'editSecondary') {
        res = await fetch('/api/categories', {
          method: 'PUT',
          body: JSON.stringify({ id: currentItem.id, name: formData.name, sort: formData.sort })
        });
      }
      if (editModalType === 'addLink') {
        res = await fetch('/api/links', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.name,
            url: formData.url,
            desc: formData.desc,
            categoryId: adminSecondaryId,
            sort: formData.sort
          })
        });
      }
      if (editModalType === 'editLink') {
        res = await fetch('/api/links', {
          method: 'PUT',
          body: JSON.stringify({
            id: currentItem.id,
            title: formData.name,
            url: formData.url,
            desc: formData.desc,
            sort: formData.sort
          })
        });
      }

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || '操作失败', 'error');
        return;
      }

      showToast('操作成功');
      await loadData();
      closeEditModal();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  // 删除操作
  const handleDelete = async () => {
    if (!confirm('确认删除？删除后无法恢复')) return;
    try {
      if (editModalType === 'editPrimary') {
        await fetch(`/api/categories?id=${currentItem.id}`, { method: 'DELETE' });
      }
      if (editModalType === 'editSecondary') {
        await fetch(`/api/categories?id=${currentItem.id}`, { method: 'DELETE' });
      }
      if (editModalType === 'editLink') {
        await fetch(`/api/links?id=${currentItem.id}`, { method: 'DELETE' });
      }
      await loadData();
      closeEditModal();
      showToast('删除成功');
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const openLink = (url) => window.open(url, '_blank');

  // 计算属性
  const primaryCategories = categories.filter(c => !c.parentId && c.visible !== false);
  const allPrimaryCategories = categories.filter(c => !c.parentId);
  const secondaryCategories = categories.filter(c => c.parentId === activePrimary && c.visible !== false);
  const adminSecondaryCats = categories.filter(c => c.parentId === adminPrimaryId);
  const adminLinks = links.filter(l => l.categoryId === adminSecondaryId);
  const currentLinks = searchKeyword.trim()
    ? links.filter(link => 
        link.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (link.desc && link.desc.toLowerCase().includes(searchKeyword.toLowerCase()))
      )
    : links.filter(link => link.categoryId === activeSecondary);

  const modalTitleMap = {
    addPrimary: '一级分类',
    editPrimary: '一级分类',
    addSecondary: '二级分类',
    editSecondary: '二级分类',
    addLink: '内容',
    editLink: '内容'
  };

  const statusTextMap = {
    active: '有效中',
    expired: '已过期',
    forever: '永久有效'
  };

  return (
    <div className="page-container">
      <h1 className="page-title">站长专属空间</h1>

      {/* 搜索栏 */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="搜索网站名称或描述..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearchKeyword(e.target.value)}
        />
        <button className="btn btn-primary" onClick={() => setSearchKeyword(searchKeyword)}>搜索</button>
        
        {/* 临时用户显示有效期 */}
        {!isAdmin && (
          <span className="expire-tip">
            {isForever ? '永久有效' : `剩余${formatRemainTime(expireAt)}`}
          </span>
        )}

        {isAdmin && (
          <button className="btn btn-default" onClick={() => setShowAdmin(true)}>后台管理</button>
        )}
      </div>

      {/* 一级分类导航 */}
      <div className="primary-nav">
        <div className="primary-nav-list scroll-hide">
          {primaryCategories.map(cat => (
            <div
              key={cat.id}
              className={`primary-nav-item ${activePrimary === cat.id ? 'active' : ''}`}
              onClick={() => setActivePrimary(cat.id)}
            >
              {cat.name}
            </div>
          ))}
          {primaryCategories.length === 0 && (
            <div style={{color:'#94a3b8', fontSize:'12px', padding:'6px 0'}}>暂无一级分类</div>
          )}
        </div>
      </div>

      {/* 主体双栏布局 */}
      <div className="main-layout">
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">二级分类</span>
          </div>
          <div className="panel-list scroll-hide">
            {secondaryCategories.map(cat => (
              <div
                key={cat.id}
                className={`list-item ${activeSecondary === cat.id ? 'active' : ''}`}
                onClick={() => setActiveSecondary(cat.id)}
              >
                <div className="item-main" style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%'}}>
                  <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{cat.name}</span>
                  <span className="category-count">{getLinkCountByCategory(cat.id)}</span>
                </div>
              </div>
            ))}
            {secondaryCategories.length === 0 && !searchKeyword && (
              <div className="empty-state">
                <div className="empty-state-icon">📂</div>
                <div className="empty-state-title">暂无二级分类</div>
                <div className="empty-state-desc">前往后台管理添加分类吧</div>
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">网站内容</span>
          </div>
          <div className="panel-list scroll-hide">
            {currentLinks.map(link => (
              <div
                key={link.id}
                className="list-item"
                onClick={() => openLink(link.url)}
              >
                <div style={{display:'flex', alignItems:'center', gap:'8px', padding:'12px 14px', width:'100%'}}>
                  <img
                    className="link-favicon"
                    data-url={link.url}
                    src={`https://www.google.com/s2/favicons?domain=${getHostname(link.url)}&sz=32`}
                    alt=""
                    onError={handleFaviconError}
                  />
                  <div className="item-main" style={{padding:0, flex:1}}>{link.title}</div>
                </div>
              </div>
            ))}
            {currentLinks.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">{searchKeyword ? '🔍' : '🔗'}</div>
                <div className="empty-state-title">
                  {searchKeyword ? '未找到匹配内容' : '暂无网站内容'}
                </div>
                <div className="empty-state-desc">
                  {searchKeyword ? '换个关键词试试吧' : '前往后台管理添加网站吧'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 后台管理大模态框 */}
      {showAdmin && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAdmin(false)}>
          <div className="modal-content admin-modal">
            <div className="admin-modal-header">
              <span className="admin-modal-title">后台管理</span>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <button 
                  className="btn btn-default btn-sm" 
                  onClick={() => {
                    setShowTempModal(true);
                    loadTempHistory();
                  }}
                >
                  临时密码
                </button>
                <button className="close-btn" onClick={() => setShowAdmin(false)}>×</button>
              </div>
            </div>

            <div className="tabs">
              <div className={`tab-item ${activeTab === 'primary' ? 'active' : ''}`} onClick={() => setActiveTab('primary')}>
                一级分类
              </div>
              <div className={`tab-item ${activeTab === 'secondary' ? 'active' : ''}`} onClick={() => setActiveTab('secondary')}>
                二级分类
              </div>
              <div className={`tab-item ${activeTab === 'link' ? 'active' : ''}`} onClick={() => setActiveTab('link')}>
                网站内容
              </div>
            </div>

            <div className="admin-modal-body">
              {/* 一级分类管理 */}
              {activeTab === 'primary' && (
                <>
                  <div className="admin-section-header">
                    <span style={{fontSize:'13px', fontWeight:500}}>所有一级分类</span>
                    <button className="btn btn-primary btn-sm" onClick={() => openAddModal('addPrimary')}>+ 添加</button>
                  </div>
                  <div className="admin-list-wrap scroll-hide">
                    <div className="admin-list">
                      {allPrimaryCategories.map(cat => (
                        <div key={cat.id} className="admin-list-item">
                          <span className="name">{cat.name}</span>
                          <div className="actions">
                            <div 
                              className={`switch ${cat.visible !== false ? 'active' : ''}`}
                              onClick={() => toggleCategoryVisible(cat)}
                            >
                              <div className="switch-dot"></div>
                            </div>
                            <button className="btn btn-default btn-sm" onClick={() => openEditModal('editPrimary', cat)}>编辑</button>
                          </div>
                        </div>
                      ))}
                      {allPrimaryCategories.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-icon">📁</div>
                          <div className="empty-state-title">暂无一级分类</div>
                          <div className="empty-state-desc">点击上方按钮添加第一个分类</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 二级分类管理 */}
              {activeTab === 'secondary' && (
                <>
                  <div className="form-item" style={{marginBottom:'16px', flexShrink:0}} ref={adminPrimarySelectRef}>
                    <label>所属一级分类</label>
                    <div className="custom-select">
                      <div
                        className={`select-trigger ${showAdminPrimarySelect ? 'open' : ''}`}
                        onClick={() => setShowAdminPrimarySelect(!showAdminPrimarySelect)}
                      >
                        <span>{allPrimaryCategories.find(c => c.id === adminPrimaryId)?.name || '请选择'}</span>
                        <span className={`select-arrow ${showAdminPrimarySelect ? 'open' : ''}`}>▼</span>
                      </div>
                      {showAdminPrimarySelect && (
                        <div className="select-dropdown scroll-hide">
                          {allPrimaryCategories.map(cat => (
                            <div
                              key={cat.id}
                              className={`select-option ${adminPrimaryId === cat.id ? 'selected' : ''}`}
                              onClick={() => {
                                setAdminPrimaryId(cat.id);
                                setShowAdminPrimarySelect(false);
                              }}
                            >
                              {cat.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-section-header">
                    <span style={{fontSize:'13px', fontWeight:500}}>二级分类列表</span>
                    <button className="btn btn-primary btn-sm" onClick={() => openAddModal('addSecondary')}>+ 添加</button>
                  </div>
                  <div className="admin-list-wrap scroll-hide">
                    <div className="admin-list">
                      {adminSecondaryCats.map(cat => (
                        <div key={cat.id} className="admin-list-item">
                          <span className="name">{cat.name}</span>
                          <div className="actions">
                            <div 
                              className={`switch ${cat.visible !== false ? 'active' : ''}`}
                              onClick={() => toggleCategoryVisible(cat)}
                            >
                              <div className="switch-dot"></div>
                            </div>
                            <button className="btn btn-default btn-sm" onClick={() => openEditModal('editSecondary', cat)}>编辑</button>
                          </div>
                        </div>
                      ))}
                      {adminSecondaryCats.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-icon">📂</div>
                          <div className="empty-state-title">暂无二级分类</div>
                          <div className="empty-state-desc">点击上方按钮添加第一个分类</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 网站内容管理 */}
              {activeTab === 'link' && (
                <>
                  <div className="form-item" style={{marginBottom:'8px', flexShrink:0}} ref={linkPrimarySelectRef}>
                    <label>所属一级分类</label>
                    <div className="custom-select">
                      <div
                        className={`select-trigger ${showLinkPrimarySelect ? 'open' : ''}`}
                        onClick={() => setShowLinkPrimarySelect(!showLinkPrimarySelect)}
                      >
                        <span>{allPrimaryCategories.find(c => c.id === adminPrimaryId)?.name || '请选择'}</span>
                        <span className={`select-arrow ${showLinkPrimarySelect ? 'open' : ''}`}>▼</span>
                      </div>
                      {showLinkPrimarySelect && (
                        <div className="select-dropdown scroll-hide">
                          {allPrimaryCategories.map(cat => (
                            <div
                              key={cat.id}
                              className={`select-option ${adminPrimaryId === cat.id ? 'selected' : ''}`}
                              onClick={() => {
                                setAdminPrimaryId(cat.id);
                                setShowLinkPrimarySelect(false);
                              }}
                            >
                              {cat.name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-item" style={{marginBottom:'16px', flexShrink:0}} ref={linkSecondarySelectRef}>
                    <label>所属二级分类</label>
                    <div className="custom-select">
                      <div
                        className={`select-trigger ${showLinkSecondarySelect ? 'open' : ''}`}
                        onClick={() => setShowLinkSecondarySelect(!showLinkSecondarySelect)}
                      >
                        <span>{adminSecondaryCats.find(c => c.id === adminSecondaryId)?.name || '请选择'}</span>
                        <span className={`select-arrow ${showLinkSecondarySelect ? 'open' : ''}`}>▼</span>
                      </div>
                      {showLinkSecondarySelect && (
                        <div className="select-dropdown scroll-hide">
                          {adminSecondaryCats.map(cat => (
                            <div
                              key={cat.id}
                              className={`select-option ${adminSecondaryId === cat.id ? 'selected' : ''}`}
                              onClick={() => {
                                setAdminSecondaryId(cat.id);
                                setShowLinkSecondarySelect(false);
                              }}
                            >
                              {cat.name}
                            </div>
                          ))}
                          {adminSecondaryCats.length === 0 && (
                            <div className="select-option" style={{color:'#94a3b8', cursor:'default'}}>暂无二级分类</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="admin-section-header">
                    <span style={{fontSize:'13px', fontWeight:500}}>网站列表</span>
                    <button className="btn btn-primary btn-sm" onClick={() => openAddModal('addLink')}>+ 添加</button>
                  </div>
                  <div className="admin-list-wrap scroll-hide">
                    <div className="admin-list">
                      {adminLinks.map(link => (
                        <div key={link.id} className="admin-list-item">
                          <span className="name">{link.title}</span>
                          <div className="actions">
                            <button className="btn btn-default btn-sm" onClick={() => openEditModal('editLink', link)}>编辑</button>
                          </div>
                        </div>
                      ))}
                      {adminLinks.length === 0 && (
                        <div className="empty-state">
                          <div className="empty-state-icon">🔗</div>
                          <div className="empty-state-title">暂无网站内容</div>
                          <div className="empty-state-desc">点击上方按钮添加第一个网站</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 临时密码模态框 */}
      {showTempModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowTempModal(false)}>
          <div className="modal-content">
            {/* 头部：标题左，生成按钮+关闭图标右 */}
            <div className="temp-modal-header">
              <span className="temp-modal-title">临时访问密码</span>
              <div style={{display:'flex', alignItems:'center'}}>
                <button className="btn btn-primary btn-sm" onClick={generateTempPassword}>生成密码</button>
                <button className="close-btn" onClick={() => setShowTempModal(false)}>×</button>
              </div>
            </div>

            <div className="temp-modal-body">
              <div className="form-item" ref={durationSelectRef}>
                <label>选择有效期</label>
                <div className="custom-select">
                  <div
                    className={`select-trigger ${showDurationSelect ? 'open' : ''}`}
                    onClick={() => setShowDurationSelect(!showDurationSelect)}
                  >
                    <span>{durationOptions.find(d => d.value === selectedDuration)?.label}</span>
                    <span className={`select-arrow ${showDurationSelect ? 'open' : ''}`}>▼</span>
                  </div>
                  {showDurationSelect && (
                    <div className="select-dropdown scroll-hide">
                      {durationOptions.map(opt => (
                        <div
                          key={opt.value}
                          className={`select-option ${selectedDuration === opt.value ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedDuration(opt.value);
                            setShowDurationSelect(false);
                          }}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 生成记录列表：滚动+隐藏滚动条+自动清理过期+吊销按钮 */}
              <div className="temp-history-list scroll-hide">
                <div style={{fontSize:'12px', color:'#64748b', marginBottom:'8px'}}>生成记录</div>
                {tempHistory.map(item => (
                  <div key={item.password + item.createdAt} className="temp-history-item">
                    <div>
                      <span className="temp-pwd">{item.password}</span>
                      <span style={{marginLeft:'8px', color:'#64748b'}}>
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
                      <span className={`temp-status ${item.status}`}>
                        {statusTextMap[item.status]}
                      </span>
                      {item.status === 'active' && (
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => revokeTempPassword(item.password)}
                        >
                          吊销
                        </button>
                      )}
                      <button 
                        className="btn btn-default btn-sm" 
                        onClick={() => copyPassword(item.password)}
                      >
                        复制
                      </button>
                    </div>
                  </div>
                ))}
                {tempHistory.length === 0 && (
                  <div className="empty-state" style={{padding:'20px 0'}}>
                    <div className="empty-state-icon">🔑</div>
                    <div className="empty-state-title">暂无生成记录</div>
                    <div className="empty-state-desc">点击上方按钮生成临时密码</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 通用编辑/添加模态框（支持回车提交） */}
      {editModalType && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
          <div className="modal-content">
            <div className="modal-title">{modalTitleMap[editModalType]}</div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-item">
                    <label>名称</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="请输入名称"
                      autoFocus
                    />
                  </div>
                  <div className="form-item input-w50">
                    <label>排序</label>
                    <input
                      type="number"
                      className="input"
                      value={formData.sort}
                      onChange={(e) => setFormData({...formData, sort: e.target.value})}
                    />
                  </div>
                </div>

                {(editModalType === 'addLink' || editModalType === 'editLink') && (
                  <>
                    <div className="form-item" style={{marginBottom:'12px'}}>
                      <label>链接地址</label>
                      <input
                        type="url"
                        className="input"
                        value={formData.url}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-item">
                      <label>描述（可选）</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.desc}
                        onChange={(e) => setFormData({...formData, desc: e.target.value})}
                        placeholder="简短说明"
                      />
                    </div>
                  </>
                )}
              </div>

              {editModalType.startsWith('add') && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={closeEditModal}>取消</button>
                  <button type="submit" className="btn btn-primary">添加</button>
                </div>
              )}

              {editModalType.startsWith('edit') && (
                <div className="modal-footer">
                  <button type="button" className="btn btn-default" onClick={closeEditModal}>取消</button>
                  <button type="button" className="btn btn-danger" onClick={handleDelete}>删除</button>
                  <button type="submit" className="btn btn-primary">确定</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Toast 提示 */}
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>{toast.text}</div>
        </div>
      )}
    </div>
  );
}