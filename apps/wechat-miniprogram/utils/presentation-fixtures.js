const { getRuntimePolicy } = require('../config/client');

function isDevelopmentPresentationEnabled() {
  const policy = getRuntimePolicy();
  return policy.envVersion === 'develop' && policy.environment === 'development';
}

const CHANNELS = Object.freeze({
  education: {
    id: 'education', name: '教育学习', short: '学', tone: 'blue',
    aliases: ['education', 'education-learning', '教育学习'],
    subcategories: [
      { id: 'all', name: '全部', short: '全' },
      { id: 'gaokao', name: '高考', short: '考' },
      { id: 'kaoyan', name: '考研', short: '研' },
      { id: 'study-abroad', name: '留学', short: '留' },
      { id: 'competition', name: '竞赛', short: '赛' },
      { id: 'paper', name: '论文写作', short: '文' }
    ],
    featured: {
      topicId: 'presentation-topic-study-abroad',
      title: '留学申请时间线全攻略',
      description: '把语言、选校、文书和网申拆成一份更容易执行的阶段清单。',
      hint: 'Development presentation preview'
    }
  },
  career: {
    id: 'career', name: '职业发展', short: '职', tone: 'green',
    aliases: ['career', 'career-development', '职业发展'],
    subcategories: [
      { id: 'all', name: '全部', short: '全' },
      { id: 'job', name: '求职', short: '求' },
      { id: 'resume', name: '简历', short: '历' },
      { id: 'interview', name: '面试', short: '面' },
      { id: 'remote', name: '远程工作', short: '远' },
      { id: 'startup', name: '创业', short: '创' }
    ],
    featured: {
      topicId: 'presentation-topic-flexible-work',
      title: '大学生灵活就业与副业选择',
      description: '从简历、真实项目到自由职业，先明确交付边界，再积累作品。',
      hint: 'Development presentation preview'
    }
  },
  lifestyle: {
    id: 'lifestyle', name: '生活服务', short: '生', tone: 'orange',
    aliases: ['lifestyle', 'lifestyle-services', '生活服务'],
    subcategories: [
      { id: 'all', name: '全部', short: '全' },
      { id: 'housing', name: '租房', short: '房' },
      { id: 'legal', name: '法律', short: '法' },
      { id: 'emotional', name: '情感', short: '情' },
      { id: 'insurance', name: '保险', short: '保' },
      { id: 'overseas', name: '海外生活', short: '海' }
    ],
    featured: {
      topicId: 'presentation-topic-renting',
      title: '租房签约前必须确认的 8 件事',
      description: '合同、押金、维修责任和退租条款，一次说明白。',
      hint: 'Development presentation preview'
    }
  },
  hobbies: {
    id: 'hobbies', name: '兴趣技能', short: '技', tone: 'pink',
    aliases: ['hobbies', 'hobbies-skills', '兴趣技能'],
    subcategories: [
      { id: 'all', name: '全部', short: '全' },
      { id: 'photography', name: '摄影', short: '摄' },
      { id: 'music', name: '音乐', short: '音' },
      { id: 'art', name: '艺术', short: '艺' },
      { id: 'fitness', name: '健身', short: '健' },
      { id: 'cooking', name: '烹饪', short: '烹' }
    ],
    featured: {
      topicId: 'presentation-topic-hobby',
      title: '从零开始建立一项能坚持的兴趣',
      description: '从最小练习开始，用持续反馈替代一次性冲动。',
      hint: 'Development presentation preview'
    }
  }
});

const TOPICS = Object.freeze([
  {
    id: 'presentation-topic-study-abroad', short: 'UK', eyebrow: '界面预览', tone: 'indigo',
    title: '留学申请季交流空间',
    description: '把申请时间线、文书经验和 offer 节奏整理成一份更容易执行的参考专题。',
    participants: 128, discussionsCount: 2, updatedText: 'Presentation fixture',
    body: [
      '申请准备最容易出现的问题，是语言、选校、文书和推荐信同时推进时失去节奏。',
      '先确定目标、预算和申请轮次，再倒推每项材料的截止时间。',
      '本页内容仅用于 development 视觉验收，不代表线上专题数据。'
    ],
    discussions: [
      { id: 'presentation-discussion-1', name: '体验用户', initial: '验', content: '建议先把目标和时间线拆开，再按轮次倒推准备事项。', likes: 0, time: '界面预览' },
      { id: 'presentation-discussion-2', name: '问问', initial: '问', content: '讨论区尚未接入正式数据与发布契约。', likes: 0, time: '功能准备中' }
    ]
  },
  {
    id: 'presentation-topic-flexible-work', short: 'JOB', eyebrow: '界面预览', tone: 'teal',
    title: '大学生灵活就业圈',
    description: '聚焦副业、灵活就业和校内外项目实践的视觉结构。',
    participants: 96, discussionsCount: 1, updatedText: 'Presentation fixture',
    body: ['先选择能够积累作品和可迁移能力的小项目。', '开始前明确交付范围、时间投入和结算方式。'],
    discussions: [{ id: 'presentation-discussion-3', name: '问问', initial: '问', content: '正式讨论数据将在契约接入后展示。', likes: 0, time: '功能准备中' }]
  },
  {
    id: 'presentation-topic-renting', short: 'HOME', eyebrow: '界面预览', tone: 'amber',
    title: '租房签约前必须确认的 8 件事',
    description: '合同、押金、维修责任和退租条款的专题视觉预览。',
    participants: 72, discussionsCount: 1, updatedText: 'Presentation fixture',
    body: ['先确认出租权限，再核对租期、押金和提前退租规则。', '所有口头承诺都应写进合同。'],
    discussions: [{ id: 'presentation-discussion-4', name: '问问', initial: '问', content: '正式讨论数据将在契约接入后展示。', likes: 0, time: '功能准备中' }]
  },
  {
    id: 'presentation-topic-hobby', short: 'GO', eyebrow: '界面预览', tone: 'rose',
    title: '从零开始建立一项能坚持的兴趣',
    description: '从最小练习开始，用持续反馈替代一次性冲动。',
    participants: 61, discussionsCount: 1, updatedText: 'Presentation fixture',
    body: ['先选择每周能重复三次的最小练习。', '记录作品和感受，而不是只记录投入时间。'],
    discussions: [{ id: 'presentation-discussion-5', name: '问问', initial: '问', content: '正式讨论数据将在契约接入后展示。', likes: 0, time: '功能准备中' }]
  }
]);

const EXPERTS = Object.freeze([
  {
    id: 'presentation-expert-study', userId: '', name: '留学经验答主', initial: '留',
    title: '申请规划方向', bio: '达人资料与服务数据尚未接入正式契约。',
    tags: ['留学申请', '文书'], category: 'education', rating: '—', responseRate: '—',
    orderCount: 0, consultationCount: 0, followersCount: 0, price: '',
    experience: '资料准备中', location: '所在地未公开', verified: false, presentationOnly: true
  },
  {
    id: 'presentation-expert-career', userId: '', name: '求职经验答主', initial: '职',
    title: '简历与面试方向', bio: '达人资料与服务数据尚未接入正式契约。',
    tags: ['求职', '面试'], category: 'career', rating: '—', responseRate: '—',
    orderCount: 0, consultationCount: 0, followersCount: 0, price: '',
    experience: '资料准备中', location: '所在地未公开', verified: false, presentationOnly: true
  },
  {
    id: 'presentation-expert-lifestyle', userId: '', name: '生活经验答主', initial: '生',
    title: '高频生活问题方向', bio: '达人资料与服务数据尚未接入正式契约。',
    tags: ['生活', '租房'], category: 'lifestyle', rating: '—', responseRate: '—',
    orderCount: 0, consultationCount: 0, followersCount: 0, price: '',
    experience: '资料准备中', location: '所在地未公开', verified: false, presentationOnly: true
  },
  {
    id: 'presentation-expert-hobbies', userId: '', name: '兴趣经验答主', initial: '技',
    title: '摄影与创作方向', bio: '达人资料与服务数据尚未接入正式契约。',
    tags: ['摄影', '创作'], category: 'hobbies', rating: '—', responseRate: '—',
    orderCount: 0, consultationCount: 0, followersCount: 0, price: '',
    experience: '资料准备中', location: '所在地未公开', verified: false, presentationOnly: true
  }
]);

function getHomePresentation() {
  if (!isDevelopmentPresentationEnabled()) return { enabled: false, hotTopics: [], experts: [] };
  return {
    enabled: true,
    hotTopics: TOPICS.slice(0, 2).map((topic) => ({
      id: topic.id,
      eyebrow: topic.eyebrow,
      short: topic.short,
      title: topic.title,
      desc: topic.description,
      watching: topic.participants,
      comments: topic.discussionsCount,
      tone: topic.tone
    })),
    experts: EXPERTS.slice(0, 2).map((expert) => ({
      id: expert.id,
      name: expert.name,
      initial: expert.initial,
      role: expert.title,
      tags: expert.tags,
      response: expert.responseRate
    }))
  };
}

function getChannelPresentation(id) {
  const base = CHANNELS[id] || CHANNELS.education;
  const enabled = isDevelopmentPresentationEnabled();
  return {
    ...base,
    featured: enabled ? base.featured : null,
    presentationEnabled: enabled
  };
}

function getTopicPresentation(id) {
  if (!isDevelopmentPresentationEnabled()) return null;
  return TOPICS.find((topic) => topic.id === id) || TOPICS[0];
}

function getExpertPresentation(id) {
  if (!isDevelopmentPresentationEnabled()) return null;
  return EXPERTS.find((expert) => expert.id === id) || null;
}

function getExpertsForChannel(category) {
  if (!isDevelopmentPresentationEnabled()) return [];
  return EXPERTS.filter((expert) => expert.category === category);
}

function getInteractionPresentation() {
  if (!isDevelopmentPresentationEnabled()) return [];
  return [
    { id: 'presentation-interaction-1', initial: '问', name: '问问', action: '互动能力准备中', content: '此卡片仅用于 development 页面视觉验收。', time: 'Presentation fixture' },
    { id: 'presentation-interaction-2', initial: '验', name: '体验用户', action: '查看了动态结构', content: '正式互动通知将在共享契约接入后展示。', time: 'Presentation fixture' }
  ];
}

function getChatPresentation(expert) {
  if (!isDevelopmentPresentationEnabled()) return [];
  return [
    { id: 'presentation-message-1', mine: false, content: `你好，我是${expert.name}。这是一条 development 页面布局内容。`, time: '界面预览' },
    { id: 'presentation-message-2', mine: true, content: '当前不会读取或发送真实私信。', time: '界面预览' }
  ];
}

module.exports = {
  isDevelopmentPresentationEnabled,
  getHomePresentation,
  getChannelPresentation,
  getTopicPresentation,
  getExpertPresentation,
  getExpertsForChannel,
  getInteractionPresentation,
  getChatPresentation
};
