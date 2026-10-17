import { StrictMode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, BookOpen, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, Compass, HeartHandshake, Home, MapPin, MessageCircle, MessageSquare, Plus, Search, Sprout, ThumbsUp, UserRound } from 'lucide-react';
import AppSurface from '@/components/ui2/AppSurface';
import PageStateCard from '@/components/common/PageStateCard';
import ExperienceTransitionPath from '@/components/experience/ExperienceTransitionPath';
import { formatExperienceTimeRange } from '@/components/experience/experiencePresentation';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PRODUCT_CHANNEL_CATALOG } from '../../packages/shared-types/src/product-channels';
import type { PublicPersonExperienceV1 } from '../../packages/shared-types/src/experience-v1';
import { PREVIEW_REVISION, answerParagraphs, longAnswer, longContext, longExperience, questionContext, questionTitle, sampleExperience, shortExperience } from './samples';
import '../../src/index.css';
import './preview.css';

if (!import.meta.env.DEV || import.meta.env.MODE !== 'development') throw new Error('UX1A_DEV_ONLY');

const stateLabels = {
  sample: '设计样例', multiple: '多条内容', long: '长篇内容', replies: '一级回复', short: '简短经历',
  loading: '加载', empty: '空内容', error: '错误', missing: '不可见', closed: '已关闭', partial: '资料不全',
};
type ViewState = keyof typeof stateLabels;
const channelIcons = [BookOpen, BriefcaseBusiness, HeartHandshake, Sprout];

function Tabs({ value, onChange, items, label }: { value: string; onChange: (value: string) => void; items: { id: string; label: string }[]; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div role="tablist" aria-label={label} className="ux-tabs">{items.map((item, index) => <button
    key={item.id} ref={node => { refs.current[index] = node; }} role="tab" id={'tab-' + item.id}
    aria-controls={value === item.id ? 'panel-' + item.id : undefined} aria-selected={value === item.id}
    tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}
    onKeyDown={event => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + offset + items.length) % items.length;
      if (offset || event.key === 'Home' || event.key === 'End') {
        event.preventDefault(); onChange(items[next].id); refs.current[next]?.focus();
      }
    }}>{item.label}</button>)}</div>;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'lab' ? 'lab' : 'user';
  const palette = params.get('palette') === 'r1' ? 'r1' : 'r2';
  const hero = params.get('hero') === 'compact' ? 'compact' : 'none';
  const mode = params.get('mode') === 'people' ? 'people' : 'questions';
  const channel = PRODUCT_CHANNEL_CATALOG.find(item => location.pathname === '/channel/' + item.slug);
  const page = location.pathname === '/question' ? 'question' : location.pathname === '/person' ? 'person' : location.pathname === '/search' ? 'search' : 'home';
  const availableStates: ViewState[] = channel || page === 'search' ? ['sample']
    : page === 'home' ? ['sample', 'loading', 'empty', 'error']
    : page === 'person' ? ['sample', 'multiple', 'long', 'short', 'loading', 'empty', 'error', 'missing', 'partial']
    : ['sample', 'multiple', 'long', 'replies', 'loading', 'empty', 'error', 'missing', 'closed', 'partial'];
  const requestedState = params.get('state') as ViewState;
  const state: ViewState = availableStates.includes(requestedState) ? requestedState : 'sample';
  const isXu = params.get('person') === 'xu';
  const personName = isXu ? '小许（虚构）' : '小林（虚构）';
  const [width, setWidth] = useState(window.innerWidth);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [replies, setReplies] = useState(false);
  const [searchTab, setSearchTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const watermark = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    document.body.dataset.uxPalette = palette;
    document.body.dataset.uxView = view;
    return () => { delete document.body.dataset.uxPalette; delete document.body.dataset.uxView; };
  }, [palette, view]);
  useLayoutEffect(() => {
    if (!watermark.current) return;
    const measure = () => document.body.style.setProperty('--ux-header-top', watermark.current!.getBoundingClientRect().height + 'px');
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(watermark.current);
    return () => { observer.disconnect(); document.body.style.removeProperty('--ux-header-top'); };
  }, [view]);
  useEffect(() => {
    const resized = () => setWidth(window.innerWidth);
    window.addEventListener('resize', resized);
    return () => window.removeEventListener('resize', resized);
  }, []);
  useEffect(() => {
    setNotice(''); setExpanded([]); setReplies(false); setSearchText('');
    window.scrollTo(0, 0); pageHeading.current?.focus();
  }, [location.pathname, isXu]);
  const select = (key: string, value: string) => {
    const next = new URLSearchParams(params); next.set(key, value); setParams(next, { replace: true });
  };
  const destination = (path: string) => {
    const [pathname, query = ''] = path.split('?');
    const next = new URLSearchParams(query);
    for (const key of ['view', 'palette', 'hero']) if (params.has(key)) next.set(key, params.get(key)!);
    return pathname + (next.size ? '?' + next.toString() : '');
  };
  const go = (path: string) => navigate(destination(path));
  const openPerson = (xu = false) => go('/person' + (xu ? '?person=xu' : ''));
  const unavailable = (message: string) => setNotice(message + ' 设计预览未发送或保存任何内容。');
  const back = () => { if (window.history.state?.idx > 0) navigate(-1); else go('/'); };
  const changeState = (value: string) => { setExpanded([]); setReplies(false); setNotice(''); select('state', value); };
  const isUnavailable = ['loading', 'error', 'missing'].includes(state);
  const stateCard = (subject: string) => <div className="ux-state" role={state === 'error' ? 'alert' : 'status'} aria-live="polite">
    <PageStateCard variant={state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'empty'}
      title={state === 'loading' ? subject + '正在加载' : state === 'error' ? subject + '暂时无法加载' : subject + '不存在或暂不可见'}
      description={state === 'loading' ? '稍等一下，让内容慢慢展开。' : state === 'error' ? '暂时没有可展示的内容，请稍后再试。' : '这里没有可以公开展示的内容。'}
      actionLabel="返回设计样例" onAction={() => changeState('sample')} />
    {view === 'lab' && <p className="ux-lab-note">静态状态样例；没有发起请求，也不以虚构内容代替失败。</p>}
  </div>;
  const topics = <div className="ux-topics" aria-label="公开 Topic 标签设计样例"><span>职业选择</span><span>转行准备</span></div>;
  const personLine = (xu = false) => <div className="ux-person-line">
    <span className="ux-avatar" aria-label="作者未设置头像"><UserRound size={22} aria-hidden /></span>
    <div><button className="ux-name" onClick={() => openPerson(xu)}>{xu ? '小许（虚构）' : '小林（虚构）'}<ChevronRight size={16} aria-hidden /></button>
      <p>{xu ? '分享过边工作边学习的经历' : '分享过从运营转向用户研究的经历'}</p></div>
  </div>;
  const questionCard = <article className="ux-question-card">
    <div className="ux-meta"><span>职业发展</span><span>虚构问题样例</span></div>
    <button className="ux-card-link" onClick={() => go('/question')}><h2>{questionTitle}</h2></button>
    <p>不是想立刻辞职，而是想先确认方向。经历过的人，当时怎样迈出第一步？</p>
    <div className="ux-card-foot"><span><MessageCircle size={16} aria-hidden />阅读免费公开回答</span><ArrowRight size={18} aria-hidden /></div>
  </article>;
  const personCard = <AppSurface className="ux-person-card">
    <p className="ux-eyebrow">这段经历，也许与你的问题有关</p>
    {personLine()}
    <div className="ux-evidence"><p><strong>从运营转向用户研究</strong><span>2022.06 – 2023.07 · 公开经历样例</span></p></div>
    <p className="ux-body">“先做一个小项目，再决定要不要换一条路。”</p>
    <p className="ux-meta">可以聊：方向验证、边工作边准备</p>
    <button className="ux-person-cta" onClick={() => openPerson()}>看看 TA 的经历 <ArrowRight size={18} aria-hidden /></button>
  </AppSurface>;

  const experienceStory = (experience: PublicPersonExperienceV1) => {
    const isLong = experience.experienceId === sampleExperience.experienceId;
    const open = expanded.includes(experience.experienceId) || (state === 'long' && !expanded.includes('collapsed'));
    const description = isLong && !open ? longExperience.slice(0, 100) + '…' : experience.description;
    const descriptionId = 'story-' + experience.experienceId;
    return <article className="ux-experience-story" key={experience.experienceId}>
      <p className="ux-experience-period">{formatExperienceTimeRange(experience.timeRange)}</p>
      <h3>{experience.title}</h3><p className="ux-experience-body" id={descriptionId}>{description}</p>
      {isLong && <button className="ux-expand" aria-expanded={open} aria-controls={descriptionId} onClick={() => {
        if (state === 'long') setExpanded(open ? ['collapsed'] : []);
        else setExpanded(previous => open ? previous.filter(id => id !== experience.experienceId) : [...previous, experience.experienceId]);
      }}>{open ? '收起完整经历' : '展开完整经历'}<ChevronDown size={16} aria-hidden /></button>}
      {experience.transitions.length > 0 && <div className="ux-transition"><p className="ux-meta">经历中的转变</p>{experience.transitions.map(transition => <ExperienceTransitionPath key={transition.transitionId} transition={transition} />)}</div>}
      {topics}
      <p className="ux-shareable">愿意分享：{experience.canShare.join('、')}</p>
    </article>;
  };
  const experiences = isXu ? [{ ...shortExperience, personId: 'ux1a-fictional-person-xu', experienceId: 'ux1a-fictional-project-xu' }]
    : state === 'short' ? [shortExperience] : state === 'multiple' ? [sampleExperience, shortExperience] : [sampleExperience];
  const replyOpen = replies || state === 'replies';
  const answer = (xu = false) => <article className="ux-answer" key={xu ? 'xu' : 'lin'}>
    {personLine(xu)}
    {(xu ? ['我最后没有转行，而是在原来的岗位里尝试了新的项目。先分清自己想离开的是什么，再决定下一步，对我来说更有帮助。'] : state === 'long' ? longAnswer : answerParagraphs).map((paragraph, index) => <p className="ux-answer-body" key={index}>{paragraph}</p>)}
    {!xu && <Link className="ux-related" to={destination('/person')}><BookOpen size={18} aria-hidden /><span>相关公开经历<strong>从运营转向用户研究的一年</strong></span><ArrowRight size={18} aria-hidden /></Link>}
    <div className="ux-answer-actions">
      <button onClick={() => unavailable('“有帮助”反馈尚未接入，未记录任何操作。')}><ThumbsUp size={18} aria-hidden />有帮助</button>
      {!xu && <button aria-expanded={replyOpen} aria-controls="preview-replies" onClick={() => state === 'replies' ? changeState('sample') : setReplies(!replies)}><MessageSquare size={18} aria-hidden />{replyOpen ? '收起回复' : '查看回复样式'}</button>}
      <button onClick={() => openPerson(xu)}>看看 TA <ArrowRight size={16} aria-hidden /></button>
    </div>
    {!xu && replyOpen && <div id="preview-replies" className="ux-reply"><strong>示例提问者（虚构）</strong><p>这个拆解让我更清楚自己的顾虑，谢谢你分享过程。</p><button onClick={() => unavailable('回复编辑尚未接入，不能发送公开回复。')}>回复此样例</button></div>}
  </article>;

  return <>
    <a className="ux-skip" href="#preview-main" onClick={event => { event.preventDefault(); document.getElementById('preview-main')?.focus(); }}>跳到预览内容</a>
    {view === 'lab' ? <div className="ux-review-bar"><strong>UX-1A 设计预览 / 非真实平台数据</strong><span>{PREVIEW_REVISION + ' · ' + width + ' CSS px · ' + page + '/' + state + ' · ' + palette.toUpperCase() + ' 配色'}</span><button onClick={() => select('view', 'user')}>查看用户视角</button></div>
      : <div className="ux-watermark" ref={watermark}><span>{PREVIEW_REVISION} · 设计预览 · 虚构内容</span><button onClick={() => select('view', 'lab')}>实验室</button></div>}
    <div className="ux-workspace">
      {view === 'lab' && <aside className="ux-review-notes"><h2>清新薄荷，<br />让经历好好说话。</h2><p>颜色、字号、首页开场和创建文案均待 PO 审批。</p><p>R1 配色开关在相同 R2 排版上比较颜色；原始 R1 截图另行保留。</p><p>城市、通知、搜索及创建都没有连接真实服务。</p></aside>}
      <div className="ux-phone">
        {view === 'lab' && <div className="ux-lab-controls" aria-label="设计预览控制">
          <label>状态<select aria-label="选择预览状态" value={state} disabled={availableStates.length === 1} onChange={event => changeState(event.target.value)}>{availableStates.map(item => <option key={item} value={item}>{stateLabels[item]}</option>)}</select></label>
          <label>配色<select aria-label="选择对照配色" value={palette} onChange={event => select('palette', event.target.value)}><option value="r2">R2 清新薄荷</option><option value="r1">R1 原配色对照</option></select></label>
          <label>首页开场<select aria-label="选择首页开场" value={hero} onChange={event => select('hero', event.target.value)}><option value="none">直接搜索</option><option value="compact">单行短句</option></select></label>
          <nav aria-label="预览页面"><Link to={destination('/')}>首页</Link><Link to={destination('/question')}>问题</Link><Link to={destination('/person')}>人物</Link></nav>
        </div>}
        {page === 'home' && !channel ? <header className="ux-home-header"><div className="ux-brand"><span><MessageCircle aria-hidden size={24} /></span>找人问问</div>{view === 'lab' && <div className="ux-header-actions"><button aria-label="城市说明：尚未选择城市" onClick={() => unavailable('城市关注尚未选择；不读取 GPS，也不推断所在地。')}><MapPin size={18} aria-hidden /></button><button aria-label="通知能力说明：预览未接入" onClick={() => unavailable('通知队列尚未接入，不显示未读数。')}><Bell size={20} aria-hidden /></button></div>}</header>
          : <header className="ux-subhead"><button className="ux-icon" onClick={back} aria-label="返回上一预览页"><ArrowLeft size={22} aria-hidden /></button><span>{channel?.label ?? (page === 'question' ? '问题详情' : page === 'person' ? '个人主页' : '搜索')}</span><span className="ux-preview-chip">设计样例</span></header>}
        <main id="preview-main" className="ux-main" tabIndex={-1}>
          <p className="ux-notice" role="status" hidden={!notice}>{notice}</p>
          {page === 'home' && <>
            <section className="ux-home-intro">
              <h1 ref={pageHeading} tabIndex={-1} className={!channel && hero === 'none' ? 'sr-only' : ''}>{channel ? channel.label + '，找一点思路' : '问问题，找经历过的人'}</h1>
              <button className="ux-search" onClick={() => go('/search')}><Search size={20} aria-hidden /><span>搜问题、找经历过的人</span><ArrowRight size={18} aria-hidden /></button>
            </section>
            {!channel && <nav className="ux-channels" aria-label="四个产品频道">{PRODUCT_CHANNEL_CATALOG.map((item, index) => { const Icon = channelIcons[index]; return <Link to={destination('/channel/' + item.slug)} key={item.slug}><span><Icon size={24} aria-hidden /></span>{item.label}</Link>; })}</nav>}
            <div className="ux-feed-head"><Tabs value={mode} onChange={value => select('mode', value)} label="首页内容类型" items={[{ id: 'questions', label: '大家都在问' }, { id: 'people', label: '找TA问问' }]} /><p>{mode === 'questions' ? '从一个具体问题开始，听听经历过的人的想法。' : '先看看经历，再聊聊你正在面对的问题。'}</p></div>
            <section role="tabpanel" id={'panel-' + mode} aria-labelledby={'tab-' + mode} className="ux-feed">
              {channel ? <PageStateCard title="频道发现尚未接入" description="此处只展示频道入口，没有生成筛选结果。" />
                : isUnavailable ? stateCard(mode === 'questions' ? '问题' : '人物')
                : state === 'empty' ? <PageStateCard title={mode === 'questions' ? '还没有可展示的问题' : '暂时没有相关的公开经历'} description="有内容时再慢慢认识彼此，不用急着填满这里。" actionLabel="查看创建意图" onAction={() => setSheet(true)} />
                : <>{mode === 'questions' ? questionCard : personCard}<p className="ux-endnote">以上为虚构设计样例</p></>}
            </section>
          </>}
          {page === 'question' && (isUnavailable ? stateCard('问题') : <>
            <section className="ux-question-detail"><div className="ux-meta"><span>职业发展</span><span>虚构问题 · 2024.01.01</span></div><h1 ref={pageHeading} tabIndex={-1}>{questionTitle}</h1>{topics}
              {state === 'closed' && <p className="ux-closed"><Check size={18} aria-hidden />问题已关闭，公开内容仍可阅读，暂不能新增回答。</p>}
              <div className="ux-context"><h2>我遇到的具体情况</h2><p>{state === 'long' ? longContext : questionContext}</p></div>
              <p className="ux-meta">提问者：示例提问者（虚构、未填写头像）</p>
              {state !== 'partial' && <p className="ux-budget">深入交流意向：¥100 以内<span>可选意向，非悬赏；公开回答免费。</span></p>}
            </section>
            <section className="ux-answers"><div className="ux-section-title"><h2>公开回答</h2><span>免费分享，各有角度</span></div>
              {state === 'empty' ? <PageStateCard title="还没有公开回答" description="如果你有自己的想法，也可以从一个具体建议说起。" /> : <>{answer()}{state === 'multiple' && answer(true)}</>}
            </section>
            <div className="ux-detail-actions"><span>公开回答免费<br />不需要先创建经历</span><button className="ux-action" disabled={state === 'closed'} onClick={() => unavailable('回答编辑尚未接入，未发布回答。')}>{state === 'closed' ? '问题已关闭' : '我来回答'}</button></div>
          </>)}
          {page === 'person' && (isUnavailable ? stateCard('个人主页') : <>
            <section className="ux-person-intro"><div className="ux-person-heading"><span className="ux-avatar ux-avatar-large" aria-label="没有头像，显示占位符"><UserRound size={32} aria-hidden /></span><div><p className="ux-eyebrow">公开资料 · 虚构设计人物</p><h1 ref={pageHeading} tabIndex={-1}>{state === 'partial' ? '未填写昵称' : personName}</h1></div></div>
              <p>{state === 'partial' ? '还没有个人介绍。' : isXu ? '边工作边探索新的可能，也愿意聊聊没有转行的选择。' : '慢慢找到适合自己的工作方式。愿意分享走过的弯路，也愿意听听你正面对的具体问题。'}</p>
            </section>
            <section className="ux-experiences"><div className="ux-section-title"><h2>公开经历</h2><span>TA 选择分享的故事</span></div>
              {state === 'empty' || state === 'partial' ? <PageStateCard title="暂时没有公开经历" description="没有可展示的经历时，就让这里保持空白。" /> : <div className="ux-timeline">{experiences.map(experienceStory)}</div>}
            </section>
            {state !== 'empty' && state !== 'partial' && <section className="ux-person-question"><h2>从经历，走向具体问题</h2><button onClick={() => go('/question')}>{questionTitle}<ArrowRight size={18} aria-hidden /></button></section>}
            <div className="ux-ask-person"><p>想进一步问 TA？<span>交流能力尚未开放，暂不能发起聊天或预约。</span></p><button className="ux-action" onClick={() => unavailable('“问问TA”下一步尚不可用。没有创建对话、预约或订单。')}>问问TA · 查看说明</button></div>
          </>)}
          {page === 'search' && <section className="ux-search-page"><h1 ref={pageHeading} tabIndex={-1}>带着问题，找经历。</h1><label className="ux-search"><Search size={20} aria-hidden /><input aria-label="搜索输入设计预览" placeholder="搜问题、找经历过的人" value={searchText} onChange={event => setSearchText(event.target.value)} /></label><p className="ux-meta">输入仅用于此处设计预览，不发送、不保存。</p><Tabs value={searchTab} onChange={setSearchTab} label="搜索内容类型" items={[{ id: 'all', label: '综合' }, { id: 'person', label: '人' }, { id: 'question', label: '问题' }]} /><div id={'panel-' + searchTab} role="tabpanel" aria-labelledby={'tab-' + searchTab}><PageStateCard title="搜索能力尚未接入" description="综合页未来分别呈现相关问题和相关的人，这里暂不展示结果。" /></div></section>}
        </main>
        {page === 'home' && <nav className="ux-bottom-nav" aria-label="底部导航">
          <Link to={destination('/')} aria-current="page"><Home size={22} aria-hidden /><span>首页</span></Link>
          <button onClick={() => unavailable('发现页未在本轮预览接入。')}><Compass size={22} aria-hidden /><span>发现</span></button>
          <Sheet open={sheet} onOpenChange={setSheet}><SheetTrigger asChild><button className="ux-create" aria-label="打开创建菜单"><Plus size={26} aria-hidden /></button></SheetTrigger>
            <SheetContent side="bottom" className="ux-sheet"><SheetHeader className="ux-sheet-header"><SheetTitle>想问，还是想分享？</SheetTitle><SheetDescription>{PREVIEW_REVISION} · 虚构设计预览 · 文案待审批</SheetDescription></SheetHeader>
              <div className="ux-intents"><button onClick={() => { setSheet(false); unavailable('“我有问题”仅展示创建意图，未进入发布流程。'); }}><CircleHelp size={26} aria-hidden /><span><strong>我有问题</strong><small>有件具体的事，想问问经历过的人</small></span><ArrowRight size={18} aria-hidden /></button>
                <button onClick={() => { setSheet(false); unavailable('“我有经历”是待审批的文案提案，未创建经历或服务。'); }}><BookOpen size={26} aria-hidden /><span><strong>我有经历</strong><small>记录走过的路，分享自己的经验</small></span><ArrowRight size={18} aria-hidden /></button></div>
              <p className="ux-skill-note">技能服务尚未开放</p>{view === 'lab' && <p className="ux-copy-decision">两项主意图的视觉文案提案，待 PO 审批；正式入口和创建契约保持原样。</p>}
            </SheetContent>
          </Sheet>
          <button onClick={() => unavailable('消息能力未在此处接入。')}><MessageSquare size={22} aria-hidden /><span>消息</span></button>
          <button onClick={() => unavailable('账号能力未在此处接入。')}><UserRound size={22} aria-hidden /><span>我的</span></button>
        </nav>}
        <footer className="ux-preview-footer">{PREVIEW_REVISION} · 虚构设计素材 · 审批待定</footer>
      </div>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
