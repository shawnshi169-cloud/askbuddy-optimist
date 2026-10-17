import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, BookOpen, BriefcaseBusiness, Check, ChevronDown, ChevronRight, CircleHelp, Compass, HeartHandshake, Home, MapPin, MessageCircle, MessageSquare, Plus, Search, Sprout, ThumbsUp, UserRound } from 'lucide-react';
import AppSurface from '@/components/ui2/AppSurface';
import PageStateCard from '@/components/common/PageStateCard';
import PersonExperienceCard from '@/components/experience/PersonExperienceCard';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PRODUCT_CHANNEL_CATALOG } from '../../packages/shared-types/src/product-channels';
import { PREVIEW_REVISION, longContext, longExperience, questionContext, questionTitle, sampleExperience } from './samples';
import '../../src/index.css';
import './preview.css';

if (!import.meta.env.DEV || import.meta.env.MODE !== 'development') throw new Error('UX1A_DEV_ONLY');

const states = ['sample', 'loading', 'empty', 'error', 'missing', 'closed', 'long', 'partial'] as const;
type ViewState = typeof states[number];
const stateLabels: Record<ViewState, string> = { sample: '设计样例', loading: '加载', empty: '空内容', error: '错误', missing: '不可见', closed: '已关闭', long: '长内容', partial: '资料不全' };
const channelIcons = [BookOpen, BriefcaseBusiness, HeartHandshake, Sprout];

function Tabs({ value, onChange, items, label }: { value: string; onChange: (value: string) => void; items: { id: string; label: string }[]; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return <div role="tablist" aria-label={label} className="ux-tabs">{items.map((item, index) => <button
    key={item.id} ref={node => { refs.current[index] = node; }} role="tab" id={`tab-${item.id}`} aria-controls={value === item.id ? `panel-${item.id}` : undefined}
    aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}
    onKeyDown={event => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + offset + items.length) % items.length;
      if (offset || event.key === 'Home' || event.key === 'End') { event.preventDefault(); onChange(items[next].id); refs.current[next]?.focus(); }
    }}>{item.label}</button>)}</div>;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'people' ? 'people' : 'questions';
  const channel = PRODUCT_CHANNEL_CATALOG.find(item => location.pathname === `/channel/${item.slug}`);
  const page = location.pathname === '/question' ? 'question' : location.pathname === '/person' ? 'person' : location.pathname === '/search' ? 'search' : 'home';
  const availableStates = channel || page === 'search' ? ['sample'] as const : page === 'home' ? ['sample', 'loading', 'empty', 'error'] as const : page === 'person' ? states.filter(item => item !== 'closed') : states;
  const requestedState = params.get('state') as ViewState;
  const state: ViewState = (availableStates as readonly string[]).includes(requestedState) ? requestedState : 'sample';
  const [width, setWidth] = useState(window.innerWidth);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [replies, setReplies] = useState(false);
  const [searchTab, setSearchTab] = useState('all');
  const [searchText, setSearchText] = useState('');
  const pageHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { const resized = () => setWidth(window.innerWidth); window.addEventListener('resize', resized); return () => window.removeEventListener('resize', resized); }, []);
  useEffect(() => {
    setNotice('');
    setExpanded(false);
    setReplies(false);
    setSearchText('');
    window.scrollTo(0, 0);
    pageHeading.current?.focus();
  }, [location.pathname]);
  const select = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key, value); setParams(next, { replace: true }); };
  const unavailable = (message: string) => setNotice(`${message} 本预览不调用真实服务，也不会保存或发送内容。`);
  const back = () => { if (window.history.state?.idx > 0) navigate(-1); else navigate('/'); };
  const openQuestion = () => navigate('/question');
  const openPerson = () => navigate('/person');
  const changeState = (value: string) => { setExpanded(false); setNotice(''); select('state', value); };
  const reset = () => changeState('sample');
  const isUnavailable = ['loading', 'error', 'missing'].includes(state);
  const stateCard = (subject: string) => <div className="ux-state" role={state === 'error' ? 'alert' : 'status'} aria-live="polite">
    <PageStateCard variant={state === 'loading' ? 'loading' : state === 'error' ? 'error' : 'empty'}
      title={state === 'loading' ? `${subject}加载状态示意` : state === 'error' ? `${subject}暂时无法加载` : `${subject}不存在或暂不可见`}
      description={state === 'loading' ? '这是静态加载参考，没有发起网络请求。' : state === 'error' ? '这是错误状态参考，不以样例内容代替真实失败。' : '不透露隐藏内容；预览不区分删除、审核或访问限制的具体原因。'}
      actionLabel="返回设计样例" onAction={reset} />
  </div>;
  const topics = <div className="ux-topics" aria-label="公开 Topic 标签设计样例"><span>职业选择</span><span>转行准备</span><small>标签为设计样例</small></div>;
  const personLine = (name: string, subtitle: string) => <div className="ux-person-line"><span className="ux-avatar" aria-label="无头像占位">{name.slice(0, 1)}</span><div><button className="ux-name" onClick={openPerson}>{name}<ChevronRight size={14} aria-hidden /></button><p>{subtitle}</p></div></div>;
  const questionCard = <article className="ux-question-card">
    <div className="ux-meta"><span>职业发展</span><span>虚构问题样例</span></div>
    <button className="ux-card-link" onClick={openQuestion}><h2>{questionTitle}</h2></button>
    <p>不是想立刻辞职，而是想先确认方向。经历过的人，当时怎样迈出第一步？</p>
    <div className="ux-card-foot"><span><MessageCircle size={15} aria-hidden />阅读免费公开回答</span><ArrowRight size={17} aria-hidden /></div>
  </article>;
  const personCard = <AppSurface className="ux-person-card">
    <span className="ux-eyebrow">从一段公开经历认识 TA</span>
    {personLine('小林（虚构）', '设计人物 · 非真实平台用户')}
    <div className="ux-evidence"><span className="ux-evidence-line" /><p><strong>从运营转向用户研究</strong><span>2022.06 — 2023.07 · 公开经历样例</span></p></div>
    <p className="ux-body">“先做一个小项目，再决定要不要换一条路。”</p><p className="ux-meta">可聊：方向验证、边工作边准备</p>
    <button className="ux-person-cta" onClick={openPerson}>看看 TA 的经历 <ArrowRight size={17} aria-hidden /></button>
  </AppSurface>;

  return <>
    <a className="ux-skip" href="#preview-main" onClick={event => { event.preventDefault(); document.getElementById('preview-main')?.focus(); }}>跳到预览内容</a>
    <div className="ux-review-bar"><strong>UX-1A 设计预览 / 非真实平台数据</strong><span>{PREVIEW_REVISION} · {width} CSS px · {page}/{state}</span></div>
    <div className="ux-workspace">
      <aside className="ux-review-notes"><p className="ux-eyebrow">ASKBUDDY / VISUAL REFERENCE</p><h2>找经历过的人，<br />问一个具体问题。</h2><p>薄荷色保留品牌识别，正文留给真实经历与具体处境。此处只有虚构设计样例。</p><hr /><h3>本轮审阅</h3><p>01 首页的信息密度<br />02 问题与回答的阅读层次<br />03 人物经历的叙事结构</p><p>所有视觉决策：<strong>审批待定</strong></p><p>无发布、聊天、预约、支付。<br />没有接入 Discovery 或真实 Auth。</p></aside>
      <div className="ux-phone">
        <div className="ux-lab-controls" aria-label="设计预览控制"><label>状态参考<select aria-label="选择预览状态" value={state} disabled={availableStates.length === 1} onChange={event => changeState(event.target.value)}>{availableStates.map(item => <option key={item} value={item}>{stateLabels[item]}</option>)}</select></label><nav aria-label="预览页面"><Link to="/">首页</Link><Link to="/question">问题</Link><Link to="/person">人物</Link></nav></div>
        {page === 'home' && !channel ? <header className="ux-home-header"><div className="ux-brand"><MessageCircle aria-hidden size={26} /><span>找人问问</span></div><div className="ux-header-actions"><button aria-label="城市说明：尚未选择城市" onClick={() => unavailable('城市关注尚未选择；不读取 GPS，也不推断所在地。')}><MapPin size={15} aria-hidden /><span>选城市</span><ChevronDown size={12} aria-hidden /></button><button className="ux-icon" aria-label="通知能力说明：预览未接入" onClick={() => unavailable('待办铃铛尚未接入，不显示未读数或优先队列。')}><Bell size={20} aria-hidden /></button></div></header> : <header className="ux-subhead"><button className="ux-icon" onClick={back} aria-label="返回上一预览页"><ArrowLeft size={22} aria-hidden /></button><span>{channel?.label ?? (page === 'question' ? '问题详情' : page === 'person' ? '个人主页' : '搜索')}</span><span className="ux-preview-chip">预览</span></header>}
        <main id="preview-main" className="ux-main" tabIndex={-1}>
          <p className="ux-notice" role="status" hidden={!notice}>{notice}</p>
          {page === 'home' && <>
            <section className="ux-home-intro">{channel && <p className="ux-eyebrow">CHANNEL / 临时浏览范围</p>}<h1 ref={pageHeading} tabIndex={-1}>{channel ? `在${channel.label}里，找一点思路。` : <>有些答案，<br />在别人的经历里。</>}</h1><button className="ux-search" onClick={() => navigate('/search')}><Search size={19} aria-hidden /><span>搜问题、找经历过的人</span><span className="ux-search-go"><ArrowRight size={16} aria-hidden /></span></button></section>
            {!channel && <nav className="ux-channels" aria-label="四个产品频道">{PRODUCT_CHANNEL_CATALOG.map((item, index) => { const Icon = channelIcons[index]; return <Link to={`/channel/${item.slug}`} key={item.slug}><span><Icon size={23} aria-hidden /></span>{item.label}</Link>; })}</nav>}
            <div className="ux-feed-head"><Tabs value={mode} onChange={value => select('mode', value)} label="首页内容类型" items={[{ id: 'questions', label: '大家都在问' }, { id: 'people', label: '找TA问问' }]} /><p>{mode === 'questions' ? '从具体的处境开始，不急着给出标准答案。' : '先看 TA 经历过什么，再决定想问什么。'}</p>{channel && <p className="ux-meta">仅演示「{channel.label}」入口；未执行领域筛选，不给人物贴永久标签。</p>}</div>
            <section role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`} className="ux-feed">{channel ? <PageStateCard title="频道发现尚未接入" description="这里只评审频道入口。没有执行筛选，也不以虚构人物冒充频道结果。" /> : isUnavailable ? stateCard(mode === 'questions' ? '问题' : '人物') : state === 'empty' ? <PageStateCard title={mode === 'questions' ? '这里还没有可展示的问题' : '暂无公开经历支撑的人物'} description="空状态参考：没有结果时不编造内容或推荐理由。" actionLabel="查看创建意图" onAction={() => setSheet(true)} /> : <>{mode === 'questions' ? questionCard : personCard}<p className="ux-endnote">设计样例到这里。真实推荐必须来自公开内容，不生成推荐理由。</p></>}</section>
          </>}
          {page === 'question' && (isUnavailable ? stateCard('问题') : <>
            <section className="ux-question-detail"><div className="ux-meta"><span>职业发展</span><span>虚构问题 · 2024.01.01</span></div><h1 ref={pageHeading} tabIndex={-1}>{questionTitle}</h1>{topics}
              {state === 'closed' && <p className="ux-closed"><Check size={17} aria-hidden />问题已关闭，公开内容仍可阅读。新增回答不可用。</p>}
              <div className="ux-context"><h2>我遇到的具体情况</h2><p>{state === 'long' ? longContext : questionContext}</p></div>
              {state !== 'partial' && <p className="ux-budget">深入交流预算意向：¥100 以内<span>仅设计样例。非悬赏、非付款要求；公开回答免费。</span></p>}<div className="ux-meta">提问者：示例提问者（虚构、无资料样例）</div>
            </section>
            <section className="ux-answers"><div className="ux-section-title"><h2>公开回答</h2><span>免费 · 不设最佳答案</span></div>
              {state === 'empty' ? <PageStateCard title="还没有公开回答" description="真正的空状态不以虚构回复补位。此处仅演示空列表，不代表平台现有数据。" /> : <article className="ux-answer">{personLine('小林（虚构）', '有相关公开经历样例 · 不代表认证')}
                <p>我也经历过“先准备，还是先离开”的犹豫。对我有帮助的，是把转行拆成一个能在当前工作之外验证的小实验。</p><p>先找一次真实的项目协作机会，记录自己愿不愿意反复做那些不太有趣的部分。判断方向时，这比“我喜欢这个行业”更具体。</p>
                <Link className="ux-related" to="/person"><BookOpen size={18} aria-hidden /><span>相关经历样例<strong>从运营转向用户研究的一年</strong></span><ArrowRight size={17} aria-hidden /></Link>
                <div className="ux-answer-actions"><button onClick={() => unavailable('“有帮助”反馈未接入，未记录任何操作。')}><ThumbsUp size={17} aria-hidden />有帮助</button><button aria-expanded={replies} aria-controls="preview-replies" onClick={() => setReplies(!replies)}><MessageSquare size={17} aria-hidden />{replies ? '收起回复' : '查看回复样式'}</button><button onClick={openPerson}>看看 TA <ArrowRight size={16} aria-hidden /></button></div>
                {replies && <div id="preview-replies" className="ux-reply"><strong>示例提问者（虚构）</strong><p>这个拆解对我理解自己的顾虑有启发。谢谢分享过程。</p><button onClick={() => unavailable('回复编辑未接入，不能发送公开回复。')}>回复此样例</button></div>}
              </article>}
            </section>
            <div className="ux-detail-actions"><span>公开回答始终免费</span><button className="ux-action" disabled={state === 'closed'} onClick={() => unavailable('回答编辑未接入；这里只展示按钮反馈。')}>{state === 'closed' ? '问题已关闭' : '分享我的经历'}</button></div>
          </>)}
          {page === 'person' && (isUnavailable ? stateCard('个人主页') : <>
            <section className="ux-person-intro"><div className="ux-person-cover" aria-hidden><span>经历，是认识一个人的开始。</span></div><div className="ux-person-summary"><span className="ux-avatar ux-avatar-large" aria-label="没有头像，显示占位符"><UserRound size={34} aria-hidden /></span><p className="ux-eyebrow">普通 PERSON · 虚构设计人物</p><h1 ref={pageHeading} tabIndex={-1}>{state === 'partial' ? '未填写昵称' : '小林（虚构）'}</h1><p>{state === 'partial' ? '尚未填写个人介绍。不会用平台生成的身份标签补全。' : '慢慢找到适合自己的工作方式。愿意分享走过的弯路，也愿意听听你正面对的具体问题。'}</p><span className="ux-meta">无头像 / 不展示城市、学校或认证推断</span></div></section>
            <section className="ux-experiences"><div className="ux-section-title"><h2>公开经历</h2><span>只看经历，不贴标签</span></div><p className="ux-meta">以下均为虚构公开样例；不包含私密经历或 Claim。</p>
              {state === 'empty' || state === 'partial' ? <PageStateCard title="暂时没有可展示的公开经历" description="没有证据就不补全履历，也不生成推荐理由。你仍可以是普通 Person。" /> : <div className="ux-timeline"><span className="ux-timeline-date">2022 — 2023<small>经历与转变 · 设计样例</small></span><PersonExperienceCard experience={{ ...sampleExperience, description: expanded || state === 'long' ? longExperience : `${longExperience.slice(0, 78)}…` }} publicTopics={topics} /><button className="ux-expand" aria-expanded={expanded || state === 'long'} onClick={() => { if (state === 'long') changeState('sample'); setExpanded(!expanded && state !== 'long'); }}>{expanded || state === 'long' ? '收起完整经历' : '展开完整经历'}<ChevronDown size={16} aria-hidden /></button></div>}
            </section>
            {state !== 'empty' && state !== 'partial' && <section className="ux-person-question"><h2>从经历，走向具体问题</h2><p>这段经历可以帮助理解怎样的问题？</p><button onClick={openQuestion}>{questionTitle}<ArrowRight size={18} aria-hidden /></button></section>}
            <div className="ux-ask-person"><p>想进一步问 TA？<span>交流能力尚未开放，不能发起聊天或预约。</span></p><button className="ux-action" onClick={() => unavailable('“问问TA”下一步尚不可用。没有创建对话、预约或订单。')}>问问TA · 查看说明</button></div>
          </>)}
          {page === 'search' && <section className="ux-search-page"><h1 ref={pageHeading} tabIndex={-1}>带着问题，找经历。</h1><label className="ux-search"><Search size={18} aria-hidden /><input aria-label="搜索输入设计预览" placeholder="搜问题、找经历过的人" value={searchText} onChange={event => setSearchText(event.target.value)} /></label><p className="ux-meta">输入只保留在此页面内存中，不发送、不保存历史。</p><Tabs value={searchTab} onChange={setSearchTab} label="搜索内容类型" items={[{ id: 'all', label: '综合' }, { id: 'people', label: '人' }, { id: 'questions', label: '问题' }]} /><div id={`panel-${searchTab}`} role="tabpanel" aria-labelledby={`tab-${searchTab}`}><PageStateCard title="搜索能力尚未接入" description="这里只评审入口与分类。综合页未来将分别呈现相关问题、相关的人，不合并评分或伪造搜索结果。" /></div></section>}
        </main>
        {page === 'home' && <nav className="ux-bottom-nav" aria-label="底部导航"><Link to="/" aria-current="page"><Home size={21} aria-hidden /><span>首页</span></Link><button onClick={() => unavailable('发现页不属于本轮三个视觉参考。')}><Compass size={21} aria-hidden /><span>发现</span></button>
          <Sheet open={sheet} onOpenChange={setSheet}><SheetTrigger asChild><button className="ux-create" aria-label="打开创建菜单"><Plus size={26} aria-hidden /></button></SheetTrigger><SheetContent side="bottom" className="ux-sheet"><SheetHeader><SheetTitle>你想从哪里开始？</SheetTitle><SheetDescription>UX-1A 设计预览 / 不会发布或保存内容</SheetDescription></SheetHeader><div className="ux-intents"><button onClick={() => { setSheet(false); unavailable('“我有问题”仅展示创建意图，未进入发布流程。'); }}><CircleHelp size={25} aria-hidden /><span><strong>我有问题</strong><small>有件具体的事，想找经历过的人问问</small></span><ArrowRight size={18} aria-hidden /></button><button onClick={() => { setSheet(false); unavailable('“我有经验 / 技能”仅展示现有合并入口，不创建经历或服务。'); }}><BookOpen size={25} aria-hidden /><span><strong>我有经验 / 技能</strong><small>记录一段经历；技能服务尚未开放</small></span><ArrowRight size={18} aria-hidden /></button></div><p className="ux-copy-decision">文案待 PO 决定：现有入口为两项，冻结文案含三种意图。建议主入口用“我有问题 / 我有经历”，技能另行解释为未开放；本轮不擅自采纳或激活。</p></SheetContent></Sheet>
          <button onClick={() => unavailable('消息和 Conversation 未在预览接入。')}><MessageSquare size={21} aria-hidden /><span>消息</span></button><button onClick={() => unavailable('我的账号未接入；预览不建立登录会话。')}><UserRound size={21} aria-hidden /><span>我的</span></button></nav>}
        <footer className="ux-preview-footer">{PREVIEW_REVISION} · 虚构设计素材 · 审批待定<br />没有真实数据读取或写入</footer>
      </div>
    </div>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><HashRouter><App /></HashRouter></StrictMode>);
