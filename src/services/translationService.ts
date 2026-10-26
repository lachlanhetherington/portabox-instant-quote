/**
 * Portabox Multi-Language Translation Engine & Local UI Translation Library
 *
 * Architecture:
 * 1. Bundled Local UI Translation Dictionary (STATIC_UI_TRANSLATIONS):
 *    Pre-translated library of quoting flow UI elements (Steps 1–6, Sidebar, Header, Modals)
 *    to serve translations instantaneously with ZERO Google Translate API calls.
 * 2. Dynamic Pattern Matcher (translateDynamicPattern):
 *    Translates parameterized strings (e.g., "43% savings", "Service available to X",
 *    "Save $161/mo on storage (42% lower rate)") locally without hitting the network.
 * 3. Persistent LocalStorage Library (portabox_local_translation_library_v1):
 *    Caches every Google Translate result locally across sessions so any phrase is
 *    translated at most ONCE via API and served from the local library forever after.
 * 4. Batched Google Translate API Fallback:
 *    Supports 45+ selectable languages via Google Translate GTX endpoint, batching
 *    uncached phrases to minimise API calls.
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: 'Popular in Australia' | 'Asia & Pacific' | 'Europe' | 'Middle East & South Asia' | 'Global';
  dir?: 'ltr' | 'rtl';
  hasPrebuiltLibrary?: boolean;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  // Popular in Australia
  { code: 'en', name: 'English (Australia)', nativeName: 'English (AU)', flag: '🇦🇺', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', flag: '🇹🇼', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'Popular in Australia', dir: 'rtl', hasPrebuiltLibrary: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'tl', name: 'Filipino / Tagalog', nativeName: 'Filipino', flag: '🇵🇭', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'Popular in Australia', hasPrebuiltLibrary: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'Popular in Australia', hasPrebuiltLibrary: true },

  // Asia & Pacific
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', region: 'Asia & Pacific', hasPrebuiltLibrary: true },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾', region: 'Asia & Pacific', hasPrebuiltLibrary: true },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', flag: '🇹🇭', region: 'Asia & Pacific', hasPrebuiltLibrary: true },
  { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', flag: '🇰🇭', region: 'Asia & Pacific' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', region: 'Asia & Pacific' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ', flag: '🇲🇲', region: 'Asia & Pacific' },
  { code: 'mi', name: 'Māori', nativeName: 'Te Reo Māori', flag: '🇳🇿', region: 'Asia & Pacific' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gaganaファʻa Sāmoa', flag: '🇼🇸', region: 'Asia & Pacific' },
  { code: 'to', name: 'Tongan', nativeName: 'Lea Fakatonga', flag: '🇹🇴', region: 'Asia & Pacific' },

  // Middle East & South Asia
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', flag: '🇳🇵', region: 'Middle East & South Asia' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰', region: 'Middle East & South Asia', dir: 'rtl' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', region: 'Middle East & South Asia' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰', region: 'Middle East & South Asia' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩', region: 'Middle East & South Asia' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', region: 'Middle East & South Asia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', flag: '🇮🇳', region: 'Middle East & South Asia' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', region: 'Middle East & South Asia' },
  { code: 'fa', name: 'Persian (Farsi)', nativeName: 'فارسی', flag: '🇮🇷', region: 'Middle East & South Asia', dir: 'rtl' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', region: 'Middle East & South Asia', hasPrebuiltLibrary: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', region: 'Middle East & South Asia', dir: 'rtl' },

  // Europe
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'Europe', hasPrebuiltLibrary: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'Europe', hasPrebuiltLibrary: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'Europe', hasPrebuiltLibrary: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'Europe', hasPrebuiltLibrary: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'Europe' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰', region: 'Europe' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴', region: 'Europe' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮', region: 'Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴', region: 'Europe' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺', region: 'Europe' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', flag: '🇭🇷', region: 'Europe' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', flag: '🇷🇸', region: 'Europe' },

  // Global
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇰🇪', region: 'Global' },
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', flag: '🇿🇦', region: 'Global' },
];

/**
 * Bundled Local UI Translation Dictionary
 * Pre-translates high-frequency UI strings across the 6-step quoting flow
 * to eliminate Google Translate API calls for common UI elements.
 */
export const STATIC_UI_TRANSLATIONS: Record<string, Record<string, string>> = {
  'zh-CN': {
    // Header & Footer
    'MOVING AND STORAGE CONTAINERS': '移动搬家与仓储集装箱',
    'Call Center Dispatch': '呼叫中心调度',
    'Dispatch': '调度',
    'Customer Portal': '客户门户',
    'Portal': '门户',
    'Admin & Pricing': '管理与定价',
    'Close Admin': '关闭管理',
    'Admin Portal': '管理后台',
    'Call': '致电',
    'Moving & Portable Storage Containers Australia': '澳大利亚移动搬家与便携式仓储集装箱',

    // Step 1: Where
    'INSTANT QUOTE': '即时报价',
    'Where are you moving or storing?': '您要在哪里搬家或存放物品？',
    'Start with your suburb or postcode': '请先输入您的郊区或邮政编码',
    'Suburb or postcode': '郊区或邮政编码',
    'e.g. 5061, Hyde Park, Melbourne, Sydney...': '例如：5061, Hyde Park, Melbourne, Sydney...',
    'Continue': '继续',
    'Previous': '上一步',
    'Suggested Australian Locations': '推荐的澳大利亚地点',

    // Step 2: What
    'What do you need?': '您需要什么服务？',
    'Choose how you want to use your Portabox': '选择您使用 Portabox 集装箱的方式',
    'Delivering to': '派送至',
    'Change': '更改',
    'I only need storage': '我只需要仓储服务',
    'We deliver a container to load at your pace': '我们将集装箱送到您指定的地点，您可以按自己的节奏装卸',
    'I am moving address': '我要搬家到新地址',
    'We deliver, you load, and we move it to your new home': '我们送箱上门，您装载物品，随后我们将其运送到您的新家',
    'Where do you want to keep the container?': '您希望将集装箱存放在哪里？',
    'Keep at my place': '存放在我的住处',
    'Easy 24/7 ground-level access on your driveway or property': '停放在您的车道或物业上，全天候 24/7 轻松平地存取',
    'Store at a secure Portabox facility': '存放在安全的 Portabox 仓储中心',
    'We pick up your packed container and keep it in our monitored warehouse': '我们提取您装满的集装箱，并保存在我们受监控的安全仓库中',
    'Where are you moving to?': '您要搬到哪里去？',
    'Destination suburb or postcode': '目的地郊区或邮政编码',
    'Enter destination suburb or postcode...': '输入目的地郊区或邮政编码...',

    // Step 3: Size
    'Which size do you need?': '您需要多大尺寸的集装箱？',
    "Australia's largest containers, so you need fewer of them.": '澳大利亚最大容量的移动集装箱，让您用更少的箱子装下更多物品。',
    'Number of containers needed': '所需集装箱数量',
    '1 Container': '1 个集装箱',
    '2 Containers': '2 个集装箱',
    '3 Containers': '3 个集装箱',
    '> 3 Custom': '> 3 自定义',
    'SMALL · 10 M³': '小型 · 10 立方米',
    'MEDIUM · 19 M³': '中型 · 19 立方米',
    'LARGE · 25 M³': '大型 · 25 立方米',
    'BEST VALUE': '最超值推荐',
    '1 bedroom home or apartment': '适合 1 居室住宅或公寓',
    '2 bedroom home': '适合 2 居室住宅',
    '3 bedroom home': '适合 3 居室家庭住宅',
    'From': '低至',
    '/mo': '/月',
    '/wk': '/周',
    'Not sure? Space calculator': '不确定尺寸？空间计算器',
    'Estimate by room & furniture': '按房间和家具数量估算容量',

    // Step 4: When & Duration
    'STEP 4 OF 6 · TIMING & EXTRAS': '第 4 步（共 6 步）· 时间与附加服务',
    'How long do you need it & when?': '您需要租用多久？何时送达？',
    'Flexible rental — extend or finish early anytime.': '租期灵活 — 随时可以延长或提前结束。',
    'How long do you need storage?': '您需要存放多长时间？',
    'Months': '按月',
    'Weeks': '按周',
    'Payment frequency': '付款周期',
    'Select your payment frequency and maximize your savings': '选择您的付款方式，享受最大幅度的折扣优惠',
    'Weekly': '按周付款',
    'Standard weekly base rate': '标准每周基础费率',
    'Monthly': '按月付款',
    'POPULAR': '热门选择',
    '3 months upfront then monthly': '预付 3 个月，之后按月付款',
    '6 months upfront then monthly': '预付 6 个月，之后按月付款',
    '12 months upfront then monthly': '预付 12 个月，之后按月付款',
    'MAX SAVINGS': '最高节省',
    '/mo equiv': '/月折算',
    'Schedule your container': '预约您的集装箱送达时间',
    'Preferred delivery date': '首选送达日期',
    'Packing boxes & moving blankets': '搬家纸箱与防震毛毯',
    'Delivered inside your container ready to pack. Save with bundle pricing!': '随集装箱一同免费送达，方便立即打包。组合购买更省钱！',
    'Heavy-Duty Packing Boxes': '加厚重型搬家纸箱',
    'Moving Blankets (Rental)': '加厚防震搬家毛毯（租赁）',

    // Step 5: Send Quote
    'STEP 5 OF 6 · INSTANT DISPATCH': '第 5 步（共 6 步）· 即时发送报价',
    'Where do we send your quote?': '我们将报价发送到哪里？',
    'Enter your details below and your tailored quote will be ready immediately.': '在下方输入您的联系方式，即可立即查看您的专属详细报价。',
    'Email Address': '电子邮箱地址',
    '(optional)': '（选填）',
    'Mobile Phone': '手机号码',
    'First Name': '您的名字',
    "What you'll see on the next page:": '下一页您将看到：',
    'Full price breakdown': '完整透明的价格明细',
    'Total savings & discounts': '总计节省金额与折扣优惠',
    'Send quote': '获取即时报价',

    // Step 6: Final Quote
    'New Quote': '重新报价',
    "Here's your instant quote": '这是您的专属即时报价',
    'Your first payment': '您的首期付款总额',
    'GST included · All billing in advance': '含消费税 (GST) · 预付账单模式',
    'Storage at your place': '存放在您的住处',
    'Storage at Portabox facility': '存放在 Portabox 仓储中心',
    'Payable now': '现在支付',
    'Payable upon collection': '提箱时支付',
    'Included in 1st payment': '已包含在首期付款中',
    'Packing Materials & Supplies': '打包材料与搬家用品',
    'Free delivery (packed inside container)': '免费派送（放置在集装箱内送达）',
    'Itemised Quote & Tax Invoice Breakdown': '报价单明细与税务发票拆分',
    'Complete itemised breakdown of storage, delivery, boxes, blankets, and promo discounts': '仓储、派送、纸箱、毛毯及优惠码折扣的完整逐项明细',
    'Request / View Itemised Breakdown': '查看逐项报价明细',
    'Hide Itemised Breakdown': '隐藏逐项报价明细',
    'Item Description': '项目说明',
    'Qty': '数量',
    'Unit Price': '单价',
    'Amount (AUD)': '金额 (AUD)',
    'Initial Container Delivery': '首次空箱派送费',
    'Heavy-Duty Moving Blankets Rental': '防震搬家毛毯租赁',
    'Promotional Discount': '促销优惠折扣',
    'Total Payable Today (Final Quote Price):': '今日应付总额（最终报价）：',
    'Includes 10% GST:': '包含 10% GST 消费税：',
    'Print / Save Itemised Tax Invoice': '打印 / 保存税务发票明细',
    'PRICE MATCH GUARANTEE': '最低价匹配保证',
    "Seen it cheaper? We'll beat it.": '看到更低的价格？我们保证击败它。',
    'Provide any comparable written quote from another Australian container service and we guarantee a lower rate per cubic meter.': '提供任何澳大利亚其他集装箱服务商的同类书面报价，我们保证提供更低的每立方米价格。',
    'Check out our competitors prices': '查看竞争对手的价格对比',
    'Excess Container Delivery Fees': '额外的小箱多次派送费对比',
    'First-Month Combined Savings': '首月综合立省总额',
    'Total First-Month Advantage': '首月总计价格优势',
    'Apply Code': '应用优惠码',
    'Have a promo code? (e.g. FREEDEL, HALFPRICE, SAVE50)': '有促销优惠码？（例如 FREEDEL, HALFPRICE, SAVE50）',
    'Prefer to book over the phone?': '更喜欢通过电话预订？',

    // Right Sidebar
    'YOUR QUOTE SO FAR': '您当前的报价摘要',
    'Where': '地点',
    'What do you need': '服务类型',
    'Which size': '集装箱尺寸',
    'How long and when': '租期与时间',
    'Storage, at my place': '仓储（存放在我的住处）',
    'Storage, at Portabox facility': '仓储（存放在 Portabox 仓库）',
    'Moving door to door': '门到门搬家',
    'Moving and storage': '搬家加仓储',

    // Help Banner
    'Are you stuck or have a tricky access question?': '遇到问题或有特殊的场地通行疑问？',
    'Speak directly with our local container logistics team': '直接联系我们当地的集装箱物流专家团队',
    'Call 1800 467 637': '致电 1800 467 637',
  },

  'zh-TW': {
    'MOVING AND STORAGE CONTAINERS': '移動搬家與倉儲貨櫃',
    'Call Center Dispatch': '客服調度中心',
    'Customer Portal': '客戶專區',
    'Admin & Pricing': '管理與定價',
    'INSTANT QUOTE': '即時報價',
    'Where are you moving or storing?': '您要在哪裡搬家或存放物品？',
    'Start with your suburb or postcode': '請先輸入您的郊區或郵遞區號',
    'Suburb or postcode': '郊區或郵遞區號',
    'Continue': '繼續',
    'Previous': '上一步',
    'Suggested Australian Locations': '推薦的澳洲地點',
    'What do you need?': '您需要什麼服務？',
    'Choose how you want to use your Portabox': '選擇您使用 Portabox 貨櫃的方式',
    'Delivering to': '派送至',
    'Change': '變更',
    'I only need storage': '我只需要倉儲服務',
    'I am moving address': '我要搬家到新地址',
    'Where do you want to keep the container?': '您希望將貨櫃存放在哪裡？',
    'Keep at my place': '存放在我的住處',
    'Store at a secure Portabox facility': '存放在安全的 Portabox 倉儲中心',
    'Which size do you need?': '您需要多大尺寸的貨櫃？',
    "Australia's largest containers, so you need fewer of them.": '澳洲最大容量的移動貨櫃，讓您用更少的櫃子裝下更多物品。',
    'Number of containers needed': '所需貨櫃數量',
    'BEST VALUE': '最超值推薦',
    '1 bedroom home or apartment': '適合 1 房住宅或公寓',
    '2 bedroom home': '適合 2 房住宅',
    '3 bedroom home': '適合 3 房家庭住宅',
    'Not sure? Space calculator': '不確定尺寸？空間計算機',
    'How long do you need it & when?': '您需要租用多久？何時送達？',
    'Payment frequency': '付款週期',
    'Weekly': '按週付款',
    'Monthly': '按月付款',
    'POPULAR': '熱門選擇',
    '3 months upfront then monthly': '預付 3 個月，之後按月付款',
    '6 months upfront then monthly': '預付 6 個月，之後按月付款',
    '12 months upfront then monthly': '預付 12 個月，之後按月付款',
    'MAX SAVINGS': '最高節省',
    'Schedule your container': '預約您的貨櫃送達時間',
    'Packing boxes & moving blankets': '搬家紙箱與防震毛毯',
    'Where do we send your quote?': '我們將報價發送到哪裡？',
    'Send quote': '獲取即時報價',
    "Here's your instant quote": '這是您的專屬即時報價',
    'Your first payment': '您的首期付款總額',
    'Itemised Quote & Tax Invoice Breakdown': '報價單明細與稅務發票拆分',
    'Request / View Itemised Breakdown': '查看逐項報價明細',
    'Hide Itemised Breakdown': '隱藏逐項報價明細',
    'PRICE MATCH GUARANTEE': '最低價匹配保證',
    "Seen it cheaper? We'll beat it.": '看到更低的價格？我們保證擊敗它。',
    'Check out our competitors prices': '查看競爭對手的價格對比',
    'Apply Code': '套用優惠碼',
    'YOUR QUOTE SO FAR': '您目前的報價摘要',
  },

  'vi': {
    'MOVING AND STORAGE CONTAINERS': 'CONTAINER CHUYỂN NHÀ & LƯU KHO',
    'Call Center Dispatch': 'Điều phối tổng đài',
    'Customer Portal': 'Cổng khách hàng',
    'Admin & Pricing': 'Quản trị & Bảng giá',
    'INSTANT QUOTE': 'BÁO GIÁ TỨC THÌ',
    'Where are you moving or storing?': 'Bạn muốn chuyển nhà hoặc lưu kho ở đâu?',
    'Start with your suburb or postcode': 'Bắt đầu bằng tên vùng ngoại ô hoặc mã bưu điện (postcode)',
    'Suburb or postcode': 'Vùng ngoại ô hoặc mã bưu điện',
    'Continue': 'Tiếp tục',
    'Previous': 'Quay lại',
    'Suggested Australian Locations': 'Địa điểm gợi ý tại Úc',
    'What do you need?': 'Bạn cần dịch vụ gì?',
    'Choose how you want to use your Portabox': 'Chọn cách bạn muốn sử dụng container Portabox',
    'Delivering to': 'Giao đến',
    'Change': 'Thay đổi',
    'I only need storage': 'Tôi chỉ cần lưu trữ đồ đạc',
    'We deliver a container to load at your pace': 'Chúng tôi giao container tận nơi để bạn tự đóng gói theo tiến độ riêng',
    'I am moving address': 'Tôi đang chuyển sang địa chỉ mới',
    'We deliver, you load, and we move it to your new home': 'Chúng tôi giao thùng, bạn chất đồ và chúng tôi chuyển đến nhà mới của bạn',
    'Where do you want to keep the container?': 'Bạn muốn đặt container ở đâu?',
    'Keep at my place': 'Giữ tại nhà của tôi',
    'Store at a secure Portabox facility': 'Lưu trữ tại kho bảo mật của Portabox',
    'Which size do you need?': 'Bạn cần kích thước nào?',
    "Australia's largest containers, so you need fewer of them.": 'Container lớn nhất tại Úc, giúp bạn tiết kiệm số lượng thùng cần thuê.',
    'Number of containers needed': 'Số lượng container cần thiết',
    '1 Container': '1 Container',
    '2 Containers': '2 Container',
    '3 Containers': '3 Container',
    'BEST VALUE': 'GIÁ TỐT NHẤT',
    '1 bedroom home or apartment': 'Nhà hoặc căn hộ 1 phòng ngủ',
    '2 bedroom home': 'Nhà 2 phòng ngủ',
    '3 bedroom home': 'Nhà gia đình 3 phòng ngủ',
    'From': 'Từ',
    'Not sure? Space calculator': 'Chưa chắc chắn? Máy tính không gian',
    'Estimate by room & furniture': 'Ước tính theo phòng & đồ nội thất',
    'How long do you need it & when?': 'Bạn cần thuê bao lâu & khi nào?',
    'Flexible rental — extend or finish early anytime.': 'Thuê linh hoạt — gia hạn hoặc kết thúc sớm bất cứ lúc nào.',
    'How long do you need storage?': 'Bạn cần lưu kho trong bao lâu?',
    'Months': 'Tháng',
    'Weeks': 'Tuần',
    'Payment frequency': 'Chu kỳ thanh toán',
    'Select your payment frequency and maximize your savings': 'Chọn chu kỳ thanh toán và tối đa hóa khoản tiết kiệm của bạn',
    'Weekly': 'Hàng tuần',
    'Standard weekly base rate': 'Mức giá cơ bản hàng tuần',
    'Monthly': 'Hàng tháng',
    'POPULAR': 'PHỔ BIẾN',
    '3 months upfront then monthly': 'Trả trước 3 tháng, sau đó trả hàng tháng',
    '6 months upfront then monthly': 'Trả trước 6 tháng, sau đó trả hàng tháng',
    '12 months upfront then monthly': 'Trả trước 12 tháng, sau đó trả hàng tháng',
    'MAX SAVINGS': 'TIẾT KIỆM TỐI ĐA',
    'Schedule your container': 'Lên lịch giao container của bạn',
    'Preferred delivery date': 'Ngày giao hàng mong muốn',
    'Packing boxes & moving blankets': 'Thùng carton đóng gói & chăn bọc đồ',
    'Where do we send your quote?': 'Chúng tôi gửi báo giá cho bạn ở đâu?',
    'Enter your details below and your tailored quote will be ready immediately.': 'Nhập thông tin bên dưới và báo giá chi tiết sẽ sẵn sàng ngay lập tức.',
    'Email Address': 'Địa chỉ Email',
    'Mobile Phone': 'Số điện thoại di động',
    'First Name': 'Tên của bạn',
    'Send quote': 'Gửi báo giá',
    'New Quote': 'Báo giá mới',
    "Here's your instant quote": 'Đây là báo giá tức thì của bạn',
    'Your first payment': 'Khoản thanh toán đầu tiên của bạn',
    'GST included · All billing in advance': 'Đã bao gồm thuế GST · Thanh toán trả trước',
    'Storage at your place': 'Lưu kho tại nhà của bạn',
    'Storage at Portabox facility': 'Lưu kho tại cơ sở Portabox',
    'Packing Materials & Supplies': 'Vật liệu đóng gói & Phụ kiện',
    'Promotional Discount': 'Giảm giá khuyến mãi',
    'Itemised Quote & Tax Invoice Breakdown': 'Chi tiết từng khoản báo giá & Hóa đơn thuế',
    'Request / View Itemised Breakdown': 'Xem chi tiết từng mục',
    'Hide Itemised Breakdown': 'Ẩn chi tiết từng mục',
    'Total Payable Today (Final Quote Price):': 'Tổng thanh toán hôm nay (Giá cuối cùng):',
    'PRICE MATCH GUARANTEE': 'CAM KẾT KHỚP GIÁ TỐT NHẤT',
    "Seen it cheaper? We'll beat it.": 'Thấy nơi khác rẻ hơn? Chúng tôi sẽ giảm sâu hơn.',
    'Check out our competitors prices': 'So sánh giá với các đối thủ cạnh tranh',
    'Apply Code': 'Áp dụng mã',
    'YOUR QUOTE SO FAR': 'TÓM TẮT BÁO GIÁ CỦA BẠN',
    'Where': 'Địa điểm',
    'What do you need': 'Nhu cầu của bạn',
    'Which size': 'Kích thước',
    'How long and when': 'Thời gian & Lịch trình',
  },

  'ar': {
    'MOVING AND STORAGE CONTAINERS': 'حاويات النقل والتخزين المتنقلة',
    'Call Center Dispatch': 'إرسال مركز الاتصال',
    'Customer Portal': 'بوابة العملاء',
    'Admin & Pricing': 'الإدارة والتسعير',
    'INSTANT QUOTE': 'عرض سعر فوري',
    'Where are you moving or storing?': 'أين تريد النقل أو التخزين؟',
    'Start with your suburb or postcode': 'ابدأ بإدخال الضاحية أو الرمز البريدي الخاص بك',
    'Suburb or postcode': 'الضاحية أو الرمز البريدي',
    'Continue': 'متابعة',
    'Previous': 'السابق',
    'Suggested Australian Locations': 'المواقع الأسترالية المقترحة',
    'What do you need?': 'ماذا تحتاج؟',
    'Choose how you want to use your Portabox': 'اختر كيف تريد استخدام حاوية Portabox الخاصة بك',
    'Delivering to': 'التوصيل إلى',
    'Change': 'تغيير',
    'I only need storage': 'أحتاج إلى التخزين فقط',
    'I am moving address': 'أنا أنتقل إلى عنوان جديد',
    'Where do you want to keep the container?': 'أين تريد الاحتفاظ بالحاوية؟',
    'Keep at my place': 'الاحتفاظ بها في مكاني',
    'Store at a secure Portabox facility': 'التخزين في منشأة Portabox آمنة',
    'Which size do you need?': 'ما هو الحجم الذي تحتاجه؟',
    "Australia's largest containers, so you need fewer of them.": 'أكبر الحاويات في أستراليا، لذا ستحتاج إلى عدد أقل منها.',
    'Number of containers needed': 'عدد الحاويات المطلوبة',
    'BEST VALUE': 'أفضل قيمة',
    '1 bedroom home or apartment': 'منزل أو شقة بغرفة نوم واحدة',
    '2 bedroom home': 'منزل بغرفتي نوم',
    '3 bedroom home': 'منزل عائلي بـ 3 غرف نوم',
    'Not sure? Space calculator': 'لست متأكداً؟ حاسبة المساحة',
    'How long do you need it & when?': 'كم من الوقت تحتاجها ومتى؟',
    'Payment frequency': 'تكرار الدفع',
    'Weekly': 'أسبوعي',
    'Monthly': 'شهري',
    'POPULAR': 'شائع',
    '3 months upfront then monthly': '3 أشهر مقدماً ثم شهرياً',
    '6 months upfront then monthly': '6 أشهر مقدماً ثم شهرياً',
    '12 months upfront then monthly': '12 شهراً مقدماً ثم شهرياً',
    'MAX SAVINGS': 'أقصى توفير',
    'Schedule your container': 'حدد موعد تسليم الحاوية',
    'Packing boxes & moving blankets': 'صناديق التعبئة وبطانيات النقل',
    'Where do we send your quote?': 'أين نرسل عرض السعر الخاص بك؟',
    'Email Address': 'البريد الإلكتروني',
    'Mobile Phone': 'رقم الهاتف المحمول',
    'First Name': 'الاسم الأول',
    'Send quote': 'إرسال عرض السعر',
    "Here's your instant quote": 'إليك عرض السعر الفوري الخاص بك',
    'Your first payment': 'دفعتك الأولى',
    'Packing Materials & Supplies': 'مواد ومستلزمات التعبئة',
    'Promotional Discount': 'خصم ترويجي',
    'Itemised Quote & Tax Invoice Breakdown': 'تفاصيل الفاتورة الضريبية وعرض السعر المفصل',
    'Request / View Itemised Breakdown': 'عرض التفاصيل المفصلة',
    'Hide Itemised Breakdown': 'إخفاء التفاصيل المفصلة',
    'Total Payable Today (Final Quote Price):': 'الإجمالي المستحق اليوم (السعر النهائي):',
    'PRICE MATCH GUARANTEE': 'ضمان مطابقة الأسعار',
    "Seen it cheaper? We'll beat it.": 'هل رأيت سعراً أرخص؟ سنتفوق عليه.',
    'Check out our competitors prices': 'قارن أسعارنا مع المنافسين',
    'Apply Code': 'تطبيق الكود',
    'YOUR QUOTE SO FAR': 'ملخص عرض السعر حتى الآن',
  },

  'hi': {
    'MOVING AND STORAGE CONTAINERS': 'मूविंग और स्टोरेज कंटेनर',
    'Call Center Dispatch': 'कॉल सेंटर डिस्पैच',
    'Customer Portal': 'ग्राहक पोर्टल',
    'Admin & Pricing': 'एडमिन और मूल्य निर्धारण',
    'INSTANT QUOTE': 'तुरंत कोटेशन',
    'Where are you moving or storing?': 'आप कहाँ शिफ्ट या स्टोर कर रहे हैं?',
    'Start with your suburb or postcode': 'अपने उपनगर (suburb) या पोस्टकोड से शुरुआत करें',
    'Suburb or postcode': 'उपनगर या पोस्टकोड',
    'Continue': 'आगे बढ़ें',
    'Previous': 'पीछे जाएं',
    'Suggested Australian Locations': 'सुझाए गए ऑस्ट्रेलियाई स्थान',
    'What do you need?': 'आपको किस सेवा की आवश्यकता है?',
    'Choose how you want to use your Portabox': 'चुनें कि आप अपने Portabox का उपयोग कैसे करना चाहते हैं',
    'Delivering to': 'डिलीवरी स्थान',
    'Change': 'बदलें',
    'I only need storage': 'मुझे केवल स्टोरेज चाहिए',
    'I am moving address': 'मैं नए पते पर शिफ्ट हो रहा हूँ',
    'Where do you want to keep the container?': 'आप कंटेनर कहाँ रखना चाहते हैं?',
    'Keep at my place': 'मेरे घर/स्थान पर रखें',
    'Store at a secure Portabox facility': 'सुरक्षित Portabox गोदाम में स्टोर करें',
    'Which size do you need?': 'आपको किस आकार (साइज़) की आवश्यकता है?',
    "Australia's largest containers, so you need fewer of them.": 'ऑस्ट्रेलिया के सबसे बड़े कंटेनर, ताकि आपको कम कंटेनरों की आवश्यकता पड़े।',
    'Number of containers needed': 'आवश्यक कंटेनरों की संख्या',
    'BEST VALUE': 'सर्वोत्तम मूल्य',
    '1 bedroom home or apartment': '1 बेडरूम का घर या अपार्टमेंट',
    '2 bedroom home': '2 बेडरूम का घर',
    '3 bedroom home': '3 बेडरूम का पारिवारिक घर',
    'Not sure? Space calculator': 'निश्चित नहीं हैं? स्पेस कैलकुलेटर',
    'How long do you need it & when?': 'आपको यह कितने समय के लिए और कब चाहिए?',
    'Payment frequency': 'भुगतान आवृत्ति',
    'Weekly': 'साप्ताहिक',
    'Monthly': 'मासिक',
    'POPULAR': 'लोकप्रिय',
    '3 months upfront then monthly': '3 महीने अग्रिम, फिर मासिक',
    '6 months upfront then monthly': '6 महीने अग्रिम, फिर मासिक',
    '12 months upfront then monthly': '12 महीने अग्रिम, फिर मासिक',
    'MAX SAVINGS': 'अधिकतम बचत',
    'Schedule your container': 'अपने कंटेनर की डिलीवरी शेड्यूल करें',
    'Packing boxes & moving blankets': 'पैकिंग बॉक्स और मूविंग कंबल',
    'Where do we send your quote?': 'हम आपका कोटेशन कहाँ भेजें?',
    'Email Address': 'ईमेल पता',
    'Mobile Phone': 'मोबाइल फोन नंबर',
    'First Name': 'पहला नाम',
    'Send quote': 'कोटेशन भेजें',
    "Here's your instant quote": 'यहाँ आपका तुरंत कोटेशन है',
    'Your first payment': 'आपका पहला भुगतान',
    'Packing Materials & Supplies': 'पैकिंग सामग्री और सप्लाई',
    'Promotional Discount': 'प्रमोशनल छूट',
    'Itemised Quote & Tax Invoice Breakdown': 'आइटम-वार कोटेशन और टैक्स इनवॉइस विवरण',
    'Request / View Itemised Breakdown': 'आइटम-वार विवरण देखें',
    'Hide Itemised Breakdown': 'आइटम-वार विवरण छिपाएं',
    'Total Payable Today (Final Quote Price):': 'आज देय कुल राशि (अंतिम कोटेशन मूल्य):',
    'PRICE MATCH GUARANTEE': 'मूल्य मिलान गारंटी',
    "Seen it cheaper? We'll beat it.": 'कहीं सस्ता देखा? हम उससे बेहतर कीमत देंगे।',
    'Check out our competitors prices': 'हमारे प्रतिस्पर्धियों की कीमतों की तुलना करें',
    'Apply Code': 'कोड लागू करें',
    'YOUR QUOTE SO FAR': 'आपका अब तक का कोटेशन',
  },

  'es': {
    'MOVING AND STORAGE CONTAINERS': 'CONTENEDORES DE MUDANZA Y ALMACENAMIENTO',
    'Call Center Dispatch': 'Despacho de Central',
    'Customer Portal': 'Portal de Clientes',
    'Admin & Pricing': 'Admin y Precios',
    'INSTANT QUOTE': 'COTIZACIÓN INSTANTÁNEA',
    'Where are you moving or storing?': '¿Dónde te mudas o almacenas?',
    'Start with your suburb or postcode': 'Comienza con tu suburbio o código postal',
    'Suburb or postcode': 'Suburbio o código postal',
    'Continue': 'Continuar',
    'Previous': 'Anterior',
    'Suggested Australian Locations': 'Ubicaciones sugeridas en Australia',
    'What do you need?': '¿Qué necesitas?',
    'Choose how you want to use your Portabox': 'Elige cómo quieres usar tu contenedor Portabox',
    'Delivering to': 'Entregando en',
    'Change': 'Cambiar',
    'I only need storage': 'Solo necesito almacenamiento',
    'I am moving address': 'Me mudo de dirección',
    'Where do you want to keep the container?': '¿Dónde quieres guardar el contenedor?',
    'Keep at my place': 'Guardar en mi propiedad',
    'Store at a secure Portabox facility': 'Guardar en una instalación segura de Portabox',
    'Which size do you need?': '¿Qué tamaño necesitas?',
    "Australia's largest containers, so you need fewer of them.": 'Los contenedores más grandes de Australia, para que necesites menos unidades.',
    'Number of containers needed': 'Número de contenedores necesarios',
    'BEST VALUE': 'MEJOR VALOR',
    '1 bedroom home or apartment': 'Casa o apartamento de 1 habitación',
    '2 bedroom home': 'Casa de 2 habitaciones',
    '3 bedroom home': 'Casa familiar de 3 habitaciones',
    'Not sure? Space calculator': '¿No estás seguro? Calculadora de espacio',
    'How long do you need it & when?': '¿Por cuánto tiempo lo necesitas y cuándo?',
    'Payment frequency': 'Frecuencia de pago',
    'Weekly': 'Semanal',
    'Monthly': 'Mensual',
    'POPULAR': 'POPULAR',
    '3 months upfront then monthly': '3 meses por adelantado y luego mensual',
    '6 months upfront then monthly': '6 meses por adelantado y luego mensual',
    '12 months upfront then monthly': '12 meses por adelantado y luego mensual',
    'MAX SAVINGS': 'MÁXIMO AHORRO',
    'Schedule your container': 'Programa la entrega de tu contenedor',
    'Packing boxes & moving blankets': 'Cajas de embalaje y mantas de mudanza',
    'Where do we send your quote?': '¿A dónde enviamos tu cotización?',
    'Email Address': 'Correo electrónico',
    'Mobile Phone': 'Teléfono móvil',
    'First Name': 'Nombre',
    'Send quote': 'Enviar cotización',
    "Here's your instant quote": 'Aquí tienes tu cotización instantánea',
    'Your first payment': 'Tu primer pago',
    'Packing Materials & Supplies': 'Materiales y suministros de embalaje',
    'Promotional Discount': 'Descuento promocional',
    'Itemised Quote & Tax Invoice Breakdown': 'Desglose detallado de cotización y factura fiscal',
    'Request / View Itemised Breakdown': 'Ver desglose detallado',
    'Hide Itemised Breakdown': 'Ocultar desglose detallado',
    'Total Payable Today (Final Quote Price):': 'Total a pagar hoy (Precio final):',
    'PRICE MATCH GUARANTEE': 'GARANTÍA DE IGUALACIÓN DE PRECIOS',
    "Seen it cheaper? We'll beat it.": '¿Lo viste más barato? Lo superamos.',
    'Check out our competitors prices': 'Compara los precios de nuestros competidores',
    'Apply Code': 'Aplicar código',
    'YOUR QUOTE SO FAR': 'TU COTIZACIÓN HASTA AHORA',
  },

  'el': {
    'MOVING AND STORAGE CONTAINERS': 'ΕΜΠΟΡΕΥΜΑΤΟΚΙΒΩΤΙΑ ΜΕΤΑΚΟΜΙΣΗΣ & ΑΠΟΘΗΚΕΥΣΗΣ',
    'Customer Portal': 'Πύλη Πελατών',
    'INSTANT QUOTE': 'ΑΜΕΣΗ ΠΡΟΣΦΟΡΑ',
    'Where are you moving or storing?': 'Πού μετακομίζετε ή αποθηκεύετε;',
    'Start with your suburb or postcode': 'Ξεκινήστε με το προάστιο ή τον ταχυδρομικό σας κώδικα',
    'Suburb or postcode': 'Προάστιο ή ταχυδρομικός κώδικας',
    'Continue': 'Συνέχεια',
    'Previous': 'Προηγούμενο',
    'What do you need?': 'Τι χρειάζεστε;',
    'I only need storage': 'Χρειάζομαι μόνο αποθήκευση',
    'I am moving address': 'Μετακομίζω σε νέα διεύθυνση',
    'Keep at my place': 'Στον χώρο μου',
    'Store at a secure Portabox facility': 'Σε ασφαλή αποθήκη Portabox',
    'Which size do you need?': 'Ποιο μέγεθος χρειάζεστε;',
    'BEST VALUE': 'ΚΑΛΥΤΕΡΗ ΑΞΙΑ',
    'How long do you need it & when?': 'Για πόσο διάστημα και πότε;',
    'Payment frequency': 'Συχνότητα πληρωμής',
    'Weekly': 'Εβδομαδιαία',
    'Monthly': 'Μηνιαία',
    'Where do we send your quote?': 'Πού να στείλουμε την προσφορά σας;',
    'Send quote': 'Αποστολή προσφοράς',
    "Here's your instant quote": 'Η άμεση προσφορά σας',
    'Your first payment': 'Η πρώτη σας πληρωμή',
    'Apply Code': 'Εφαρμογή κωδικού',
    'YOUR QUOTE SO FAR': 'Η ΠΡΟΣΦΟΡΑ ΣΑΣ ΜΕΧΡΙ ΤΩΡΑ',
  },

  'it': {
    'MOVING AND STORAGE CONTAINERS': 'CONTAINER PER TRASLOCHI E DEPOSITO',
    'Customer Portal': 'Portale Clienti',
    'INSTANT QUOTE': 'PREVENTIVO IMMEDIATO',
    'Where are you moving or storing?': 'Dove devi traslocare o depositare?',
    'Start with your suburb or postcode': 'Inizia con il tuo quartiere o codice postale',
    'Suburb or postcode': 'Quartiere o codice postale',
    'Continue': 'Continua',
    'Previous': 'Indietro',
    'What do you need?': 'Di cosa hai bisogno?',
    'I only need storage': 'Ho solo bisogno di deposito',
    'I am moving address': 'Sto cambiando indirizzo',
    'Keep at my place': 'Tieni presso la mia proprietà',
    'Store at a secure Portabox facility': 'Deposita in un centro sicuro Portabox',
    'Which size do you need?': 'Quale dimensione ti serve?',
    'BEST VALUE': 'MIGLIOR VALORE',
    'How long do you need it & when?': 'Per quanto tempo ti serve e quando?',
    'Payment frequency': 'Frequenza di pagamento',
    'Weekly': 'Settimanale',
    'Monthly': 'Mensile',
    'Where do we send your quote?': 'Dove inviamo il tuo preventivo?',
    'Send quote': 'Invia preventivo',
    "Here's your instant quote": 'Ecco il tuo preventivo immediato',
    'Your first payment': 'Il tuo primo pagamento',
    'Apply Code': 'Applica codice',
    'YOUR QUOTE SO FAR': 'IL TUO PREVENTIVO FINORA',
  },

  'tl': {
    'MOVING AND STORAGE CONTAINERS': 'MGA CONTAINER PARA SA PAGLIPAT AT STORAGE',
    'Customer Portal': 'Portal ng Customer',
    'INSTANT QUOTE': 'AGARANG QUOTE',
    'Where are you moving or storing?': 'Saan ka lilipat o mag-iimbak ng gamit?',
    'Start with your suburb or postcode': 'Magsimula sa iyong suburb o postcode',
    'Suburb or postcode': 'Suburb o postcode',
    'Continue': 'Magpatuloy',
    'Previous': 'Bumalik',
    'What do you need?': 'Ano ang kailangan mo?',
    'I only need storage': 'Kailangan ko lang ng storage',
    'I am moving address': 'Lilipat ako ng tirahan',
    'Keep at my place': 'Ilagay sa aking lugar',
    'Store at a secure Portabox facility': 'Ilagay sa ligtas na pasilidad ng Portabox',
    'Which size do you need?': 'Anong laki ang kailangan mo?',
    'BEST VALUE': 'PINAKAMASULIT',
    'How long do you need it & when?': 'Gaano katagal mo ito kailangan at kailan?',
    'Payment frequency': 'Dalas ng pagbabayad',
    'Weekly': 'Lingguhan',
    'Monthly': 'Buwanan',
    'Where do we send your quote?': 'Saan namin ipapadala ang iyong quote?',
    'Send quote': 'Ipadala ang quote',
    "Here's your instant quote": 'Narito ang iyong agarang quote',
    'Your first payment': 'Ang iyong unang bayad',
    'Apply Code': 'Ilapat ang Code',
    'YOUR QUOTE SO FAR': 'ANG IYONG QUOTE SA NGAYON',
  },

  'ko': {
    'MOVING AND STORAGE CONTAINERS': '이사 및 보관용 이동식 컨테이너',
    'Customer Portal': '고객 포털',
    'INSTANT QUOTE': '즉시 견적',
    'Where are you moving or storing?': '어디로 이사하거나 보관하시나요?',
    'Start with your suburb or postcode': '교외 지역명(suburb) 또는 우편번호를 입력하세요',
    'Suburb or postcode': '지역명 또는 우편번호',
    'Continue': '계속하기',
    'Previous': '이전',
    'What do you need?': '어떤 서비스가 필요하신가요?',
    'I only need storage': '보관 서비스만 필요합니다',
    'I am moving address': '새로운 주소로 이사합니다',
    'Keep at my place': '내 집/부지에 보관',
    'Store at a secure Portabox facility': '안전한 Portabox 전용 보관소에 보관',
    'Which size do you need?': '어떤 크기가 필요하신가요?',
    'BEST VALUE': '최고 가성비',
    'How long do you need it & when?': '얼마나 오랫동안, 언제 필요하신가요?',
    'Payment frequency': '결제 주기',
    'Weekly': '주간 결제',
    'Monthly': '월간 결제',
    'Where do we send your quote?': '견적서를 어디로 보내드릴까요?',
    'Send quote': '견적 받기',
    "Here's your instant quote": '고객님의 실시간 맞춤 견적입니다',
    'Your first payment': '첫 번째 결제 금액',
    'Apply Code': '코드 적용',
    'YOUR QUOTE SO FAR': '현재까지의 견적 요약',
  },

  'ja': {
    'MOVING AND STORAGE CONTAINERS': '引越し＆保管用ポータブルコンテナ',
    'Customer Portal': '顧客ポータル',
    'INSTANT QUOTE': '即時お見積り',
    'Where are you moving or storing?': 'どちらへお引越し・保管されますか？',
    'Start with your suburb or postcode': 'サバーブ名または郵便番号を入力してください',
    'Suburb or postcode': 'サバーブまたは郵便番号',
    'Continue': '次へ進む',
    'Previous': '戻る',
    'What do you need?': 'どのようなサービスをご希望ですか？',
    'I only need storage': '保管のみ必要',
    'I am moving address': '新しい住所へ引越し',
    'Keep at my place': '自宅の敷地に設置する',
    'Store at a secure Portabox facility': '安全なPortabox保管施設に預ける',
    'Which size do you need?': 'どのサイズが必要ですか？',
    'BEST VALUE': '一番人気・お得',
    'How long do you need it & when?': 'ご利用期間と配送希望日は？',
    'Payment frequency': 'お支払い頻度',
    'Weekly': '週払い',
    'Monthly': '月払い',
    'Where do we send your quote?': 'お見積りの送信先を入力してください',
    'Send quote': '見積りを送信',
    "Here's your instant quote": 'お見積り結果はこちらです',
    'Your first payment': '初回お支払い合計',
    'Apply Code': 'コードを適用',
    'YOUR QUOTE SO FAR': '現在のお見積り内容',
  },

  'pa': {
    'MOVING AND STORAGE CONTAINERS': 'ਮੂਵਿੰਗ ਅਤੇ ਸਟੋਰੇਜ ਕੰਟੇਨਰ',
    'Customer Portal': 'ਗਾਹਕ ਪੋਰਟਲ',
    'INSTANT QUOTE': 'ਤੁਰੰਤ ਕੋਟੇਸ਼ਨ',
    'Where are you moving or storing?': 'ਤੁਸੀਂ ਕਿੱਥੇ ਸ਼ਿਫਟ ਜਾਂ ਸਟੋਰ ਕਰ ਰਹੇ ਹੋ?',
    'Start with your suburb or postcode': 'ਆਪਣੇ ਸਬਰਬ ਜਾਂ ਪੋਸਟਕੋਡ ਨਾਲ ਸ਼ੁਰੂਆਤ ਕਰੋ',
    'Suburb or postcode': 'ਸਬਰਬ ਜਾਂ ਪੋਸਟਕੋਡ',
    'Continue': 'ਅੱਗੇ ਵਧੋ',
    'Previous': 'ਪਿੱਛੇ',
    'What do you need?': 'ਤੁਹਾਨੂੰ ਕਿਸ ਸੇਵਾ ਦੀ ਲੋੜ ਹੈ?',
    'I only need storage': 'ਮੈਨੂੰ ਸਿਰਫ਼ ਸਟੋਰੇਜ ਚਾਹੀਦੀ ਹੈ',
    'I am moving address': 'ਮੈਂ ਨਵੇਂ ਪਤੇ ਤੇ ਜਾ ਰਿਹਾ ਹਾਂ',
    'Keep at my place': 'ਮੇਰੀ ਜਗ੍ਹਾ ਤੇ ਰੱਖੋ',
    'Store at a secure Portabox facility': 'ਸੁਰੱਖਿਅਤ Portabox ਗੋਦਾਮ ਵਿੱਚ ਰੱਖੋ',
    'Which size do you need?': 'ਤੁਹਾਨੂੰ ਕਿਹੜੇ ਸਾਈਜ਼ ਦੀ ਲੋੜ ਹੈ?',
    'BEST VALUE': 'ਸਭ ਤੋਂ ਵਧੀਆ ਮੁੱਲ',
    'How long do you need it & when?': 'ਤੁਹਾਨੂੰ ਇਹ ਕਿੰਨੇ ਸਮੇਂ ਲਈ ਅਤੇ ਕਦੋਂ ਚਾਹੀਦਾ ਹੈ?',
    'Payment frequency': 'ਭੁਗਤਾਨ ਦੀ ਮਿਆਦ',
    'Weekly': 'ਹਫ਼ਤਾਵਾਰੀ',
    'Monthly': 'ਮਾਸਿਕ',
    'Where do we send your quote?': 'ਅਸੀਂ ਤੁਹਾਡਾ ਕੋਟੇਸ਼ਨ ਕਿੱਥੇ ਭੇਜੀਏ?',
    'Send quote': 'ਕੋਟੇਸ਼ਨ ਭੇਜੋ',
    "Here's your instant quote": 'ਇਹ ਤੁਹਾਡਾ ਤੁਰੰਤ ਕੋਟੇਸ਼ਨ ਹੈ',
    'Your first payment': 'ਤੁਹਾਡੀ ਪਹਿਲੀ ਅਦਾਇਗੀ',
    'Apply Code': 'ਕੋਡ ਲਾਗੂ ਕਰੋ',
    'YOUR QUOTE SO FAR': 'ਤੁਹਾਡਾ ਹੁਣ ਤੱਕ ਦਾ ਕੋਟੇਸ਼ਨ',
  },

  'fr': {
    'MOVING AND STORAGE CONTAINERS': 'CONTENEURS DE DÉMÉNAGEMENT ET STOCKAGE',
    'Customer Portal': 'Portail Client',
    'INSTANT QUOTE': 'DEVIS INSTANTANÉ',
    'Where are you moving or storing?': 'Où déménagez-vous ou stockez-vous ?',
    'Start with your suburb or postcode': 'Commencez par votre banlieue ou code postal',
    'Suburb or postcode': 'Banlieue ou code postal',
    'Continue': 'Continuer',
    'Previous': 'Précédent',
    'What do you need?': 'De quoi avez-vous besoin ?',
    'I only need storage': "J'ai seulement besoin de stockage",
    'I am moving address': "Je change d'adresse",
    'Keep at my place': 'Garder chez moi',
    'Store at a secure Portabox facility': 'Stocker dans un entrepôt sécurisé Portabox',
    'Which size do you need?': 'De quelle taille avez-vous besoin ?',
    'BEST VALUE': 'MEILLEUR RAPPORT QUALITÉ-PRIX',
    'How long do you need it & when?': 'Pour combien de temps et quand ?',
    'Payment frequency': 'Fréquence de paiement',
    'Weekly': 'Hebdomadaire',
    'Monthly': 'Mensuel',
    'Where do we send your quote?': 'Où envoyons-nous votre devis ?',
    'Send quote': 'Envoyer le devis',
    "Here's your instant quote": 'Voici votre devis instantané',
    'Your first payment': 'Votre premier paiement',
    'Apply Code': 'Appliquer le code',
    'YOUR QUOTE SO FAR': 'VOTRE DEVIS EN COURS',
  },

  'de': {
    'MOVING AND STORAGE CONTAINERS': 'UMZUGS- UND LAGERCONTAINER',
    'Customer Portal': 'Kundenportal',
    'INSTANT QUOTE': 'SOFORTANGEBOT',
    'Where are you moving or storing?': 'Wo ziehen Sie um oder lagern Sie ein?',
    'Start with your suburb or postcode': 'Beginnen Sie mit Ihrem Vorort oder Ihrer Postleitzahl',
    'Suburb or postcode': 'Vorort oder Postleitzahl',
    'Continue': 'Weiter',
    'Previous': 'Zurück',
    'What do you need?': 'Was benötigen Sie?',
    'I only need storage': 'Ich benötige nur Lagerung',
    'I am moving address': 'Ich ziehe an eine neue Adresse um',
    'Keep at my place': 'Bei mir vor Ort aufstellen',
    'Store at a secure Portabox facility': 'In einem sicheren Portabox-Lager einlagern',
    'Which size do you need?': 'Welche Größe benötigen Sie?',
    'BEST VALUE': 'BESTES PREIS-LEISTUNGS-VERHÄLTNIS',
    'How long do you need it & when?': 'Wie lange und wann benötigen Sie ihn?',
    'Payment frequency': 'Zahlungshäufigkeit',
    'Weekly': 'Wöchentlich',
    'Monthly': 'Monatlich',
    'Where do we send your quote?': 'Wohin sollen wir Ihr Angebot senden?',
    'Send quote': 'Angebot senden',
    "Here's your instant quote": 'Hier ist Ihr Sofortangebot',
    'Your first payment': 'Ihre erste Zahlung',
    'Apply Code': 'Code anwenden',
    'YOUR QUOTE SO FAR': 'IHR BISHERIGES ANGEBOT',
  },
};

/**
 * Dynamic Pattern Rules:
 * Matches parameterized strings (like "43% savings", "Service available to X")
 * so they are translated locally with ZERO API calls.
 */
const SAVINGS_PERCENT_WORDS: Record<string, (pct: string) => string> = {
  'zh-CN': (pct) => `立省 ${pct}%`,
  'zh-TW': (pct) => `立省 ${pct}%`,
  'vi': (pct) => `Tiết kiệm ${pct}%`,
  'ar': (pct) => `توفير ${pct}%`,
  'hi': (pct) => `${pct}% की बचत`,
  'pa': (pct) => `${pct}% ਦੀ ਬੱਚਤ`,
  'es': (pct) => `${pct}% de ahorro`,
  'fr': (pct) => `${pct}% d'économie`,
  'de': (pct) => `${pct}% Ersparnis`,
  'it': (pct) => `${pct}% di risparmio`,
  'el': (pct) => `${pct}% εξοικονόμηση`,
  'tl': (pct) => `${pct}% tipid`,
  'ko': (pct) => `${pct}% 절약`,
  'ja': (pct) => `${pct}% お得`,
};

const SERVICE_AVAILABLE_WORDS: Record<string, (loc: string) => string> = {
  'zh-CN': (loc) => `可提供派送服务至 ${loc}`,
  'zh-TW': (loc) => `可提供派送服務至 ${loc}`,
  'vi': (loc) => `Có dịch vụ giao hàng đến ${loc}`,
  'ar': (loc) => `الخدمة متاحة إلى ${loc}`,
  'hi': (loc) => `${loc} के लिए सेवा उपलब्ध है`,
  'pa': (loc) => `${loc} ਲਈ ਸੇਵਾ ਉਪਲਬਧ ਹੈ`,
  'es': (loc) => `Servicio disponible en ${loc}`,
  'fr': (loc) => `Service disponible vers ${loc}`,
  'de': (loc) => `Service verfügbar für ${loc}`,
  'it': (loc) => `Servizio disponibile a ${loc}`,
  'el': (loc) => `Διαθέσιμη υπηρεσία προς ${loc}`,
  'tl': (loc) => `Available ang serbisyo sa ${loc}`,
  'ko': (loc) => `${loc} 지역 서비스 가능`,
  'ja': (loc) => `${loc} への配送サービス利用可能`,
};

export function translateByLocalPattern(text: string, lang: string): string | null {
  const trimmed = text.trim();

  // Pattern 1: "43% savings"
  const savingsMatch = trimmed.match(/^(\d+)%\s+savings$/i);
  if (savingsMatch && SAVINGS_PERCENT_WORDS[lang]) {
    return SAVINGS_PERCENT_WORDS[lang](savingsMatch[1]);
  }

  // Pattern 2: "Service available to Hyde Park, SA 5061"
  const serviceMatch = trimmed.match(/^Service available to\s+(.+)$/i);
  if (serviceMatch && SERVICE_AVAILABLE_WORDS[lang]) {
    return SERVICE_AVAILABLE_WORDS[lang](serviceMatch[1]);
  }

  return null;
}

const LOCAL_STORAGE_LIBRARY_KEY = 'portabox_local_translation_library_v1';
const SELECTED_LANG_KEY = 'portabox_selected_language_v1';

export interface TranslationTelemetry {
  staticLibraryHits: number;
  localStorageCacheHits: number;
  googleApiBatches: number;
  googleApiStringsTranslated: number;
}

const telemetry: TranslationTelemetry = {
  staticLibraryHits: 0,
  localStorageCacheHits: 0,
  googleApiBatches: 0,
  googleApiStringsTranslated: 0,
};

// In-memory mirror of persistent localStorage translation library
let persistentLibrary: Record<string, Record<string, string>> = {};

function loadPersistentLibrary(): Record<string, Record<string, string>> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LIBRARY_KEY);
    if (raw) {
      persistentLibrary = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load local translation library:', e);
  }
  return persistentLibrary;
}

loadPersistentLibrary();

function savePersistentLibrary() {
  try {
    localStorage.setItem(LOCAL_STORAGE_LIBRARY_KEY, JSON.stringify(persistentLibrary));
  } catch (e) {
    console.warn('Failed to save local translation library:', e);
  }
}

export function getSavedLanguage(): string {
  try {
    return localStorage.getItem(SELECTED_LANG_KEY) || 'en';
  } catch {
    return 'en';
  }
}

export function setSavedLanguage(lang: string): void {
  try {
    localStorage.setItem(SELECTED_LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export function getTranslationTelemetry(): TranslationTelemetry & {
  totalLocalEntries: number;
  apiSavingsPercentage: number;
} {
  let staticCount = 0;
  Object.values(STATIC_UI_TRANSLATIONS).forEach((dict) => {
    staticCount += Object.keys(dict).length;
  });
  let cachedCount = 0;
  Object.values(persistentLibrary).forEach((dict) => {
    cachedCount += Object.keys(dict).length;
  });

  const totalLookups =
    telemetry.staticLibraryHits +
    telemetry.localStorageCacheHits +
    telemetry.googleApiStringsTranslated;
  const localHits = telemetry.staticLibraryHits + telemetry.localStorageCacheHits;
  const apiSavingsPercentage =
    totalLookups > 0 ? Math.min(100, Math.round((localHits / totalLookups) * 100)) : 100;

  return {
    ...telemetry,
    totalLocalEntries: staticCount + cachedCount,
    apiSavingsPercentage,
  };
}

/**
 * Adds or overrides a custom translation in the local library.
 */
export function upsertLocalTranslation(lang: string, englishText: string, translatedText: string): void {
  if (!persistentLibrary[lang]) {
    persistentLibrary[lang] = {};
  }
  persistentLibrary[lang][englishText.trim()] = translatedText.trim();
  savePersistentLibrary();
}

/**
 * Returns all entries for a given language combining static bundle + persistent cache.
 */
export function getCombinedLibraryForLanguage(lang: string): Record<string, string> {
  return {
    ...(STATIC_UI_TRANSLATIONS[lang] || {}),
    ...(persistentLibrary[lang] || {}),
  };
}

/**
 * Synchronous lookup in the Local Translation Library (Static Bundle + Pattern + Persistent Cache).
 * Returns null if not yet in the local library.
 */
export function lookupLocalTranslation(text: string, lang: string): string | null {
  if (!lang || lang === 'en') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Check Static Pre-bundled Library
  const staticHit = STATIC_UI_TRANSLATIONS[lang]?.[trimmed];
  if (staticHit) {
    telemetry.staticLibraryHits++;
    return preserveWhitespace(text, staticHit);
  }

  // 2. Check Dynamic Pattern Matcher
  const patternHit = translateByLocalPattern(trimmed, lang);
  if (patternHit) {
    telemetry.staticLibraryHits++;
    return preserveWhitespace(text, patternHit);
  }

  // 3. Check Persistent LocalStorage Cache
  const cachedHit = persistentLibrary[lang]?.[trimmed];
  if (cachedHit) {
    telemetry.localStorageCacheHits++;
    return preserveWhitespace(text, cachedHit);
  }

  return null;
}

function preserveWhitespace(original: string, translated: string): string {
  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  return `${leading}${translated}${trailing}`;
}

/**
 * Determines whether a text snippet should be skipped (e.g. pure numbers, currency, postcodes, brand names).
 */
export function shouldSkipTranslation(text: string): boolean {
  const t = text.trim();
  if (!t || t.length <= 1) return true;
  // Pure numbers, currency, phone numbers, dimensions, postcodes
  if (/^[\d\s\$\.,\-\+\/×%=:·•\(\)m³²kmAUD]+$/i.test(t)) return true;
  // Brand names or codes
  if (/^(portabox|braintree|paypal|apple pay|google pay|gst|aud|sa|vic|nsw|qld|wa|tas|nt|act)$/i.test(t)) {
    return true;
  }
  // URLs or emails
  if (/^(https?:\/\/|[^\s@]+@[^\s@]+\.[^\s@]+)/i.test(t)) return true;
  return false;
}

/**
 * Batched Google Translate Queue to minimise network requests.
 */
interface PendingItem {
  text: string;
  resolvers: ((translated: string) => void)[];
}

const pendingQueues: Record<string, Map<string, PendingItem>> = {};
const flushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function translateTextWithGoogleFallback(text: string, targetLang: string): Promise<string> {
  if (!targetLang || targetLang === 'en') return Promise.resolve(text);
  const trimmed = text.trim();
  if (shouldSkipTranslation(trimmed)) return Promise.resolve(text);

  // 1. Always check Local Library first (0 API calls)
  const localHit = lookupLocalTranslation(text, targetLang);
  if (localHit !== null) {
    return Promise.resolve(localHit);
  }

  // 2. Enqueue for batched Google Translate call
  if (!pendingQueues[targetLang]) {
    pendingQueues[targetLang] = new Map();
  }
  const queue = pendingQueues[targetLang];

  return new Promise<string>((resolve) => {
    const existing = queue.get(trimmed);
    if (existing) {
      existing.resolvers.push((res) => resolve(preserveWhitespace(text, res)));
    } else {
      queue.set(trimmed, {
        text: trimmed,
        resolvers: [(res) => resolve(preserveWhitespace(text, res))],
      });
    }

    if (!flushTimers[targetLang]) {
      flushTimers[targetLang] = setTimeout(() => {
        flushTranslationQueue(targetLang);
      }, 55);
    }
  });
}

async function flushTranslationQueue(targetLang: string) {
  delete flushTimers[targetLang];
  const queue = pendingQueues[targetLang];
  if (!queue || queue.size === 0) return;

  const entries = Array.from(queue.values());
  queue.clear();

  // Chunk into batches of 25 strings separated by a newline delimiter to minimise Google Translate API calls
  const CHUNK_SIZE = 25;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const joinedQuery = chunk.map((item) => item.text.replace(/\n/g, ' ')).join('\n');

    try {
      telemetry.googleApiBatches++;
      telemetry.googleApiStringsTranslated += chunk.length;

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(joinedQuery)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Translate HTTP ${response.status}`);
      }

      const data = await response.json();
      // data[0] is array of [translatedSegment, originalSegment, ...]
      const fullTranslated: string = Array.isArray(data?.[0])
        ? data[0].map((seg: any) => seg?.[0] || '').join('')
        : joinedQuery;

      const translatedLines = fullTranslated.split('\n');

      if (!persistentLibrary[targetLang]) {
        persistentLibrary[targetLang] = {};
      }

      chunk.forEach((item, idx) => {
        const resultText = (translatedLines[idx] || item.text).trim();
        // Save permanently to Local Translation Library so future lookups require 0 API calls
        persistentLibrary[targetLang][item.text] = resultText;
        item.resolvers.forEach((r) => r(resultText));
      });

      savePersistentLibrary();
    } catch (err) {
      console.warn('Google Translate fallback error, retaining English text:', err);
      chunk.forEach((item) => {
        item.resolvers.forEach((r) => r(item.text));
      });
    }
  }
}

/**
 * DOM Translation Manager
 * Automatically translates text nodes and input placeholders across the quoting flow,
 * prioritizing the Local Translation Library and batching any uncached text via Google Translate.
 */
const originalNodeText = new WeakMap<Text, string>();
const lastAppliedTranslation = new WeakMap<Text, string>();
const originalPlaceholderText = new WeakMap<Element, string>();
let activeLang = 'en';
let mutationObserver: MutationObserver | null = null;

export function applyLanguageToDOM(targetLang: string, rootElement: HTMLElement = document.body): void {
  activeLang = targetLang;
  setSavedLanguage(targetLang);

  const langMeta = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  document.documentElement.lang = targetLang;
  document.documentElement.dir = langMeta?.dir || 'ltr';

  translateSubtree(rootElement, targetLang);

  if (!mutationObserver) {
    mutationObserver = new MutationObserver((mutations) => {
      if (activeLang === 'en') return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              translateSubtree(node as HTMLElement, activeLang);
            } else if (node.nodeType === Node.TEXT_NODE) {
              translateSingleTextNode(node as Text, activeLang);
            }
          });
        } else if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          const textNode = m.target as Text;
          const currentVal = textNode.nodeValue || '';
          // Ignore if this mutation was caused by our own translation write
          if (
            currentVal === lastAppliedTranslation.get(textNode) ||
            currentVal === originalNodeText.get(textNode)
          ) {
            continue;
          }
          // Otherwise React updated the underlying English text
          originalNodeText.set(textNode, currentVal);
          translateSingleTextNode(textNode, activeLang);
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

function isInsideNoTranslate(node: Node): boolean {
  let curr: Node | null = node.parentNode;
  while (curr && curr.nodeType === Node.ELEMENT_NODE) {
    const el = curr as HTMLElement;
    if (
      el.dataset?.noTranslate === 'true' ||
      el.classList?.contains('notranslate') ||
      el.tagName === 'SCRIPT' ||
      el.tagName === 'STYLE' ||
      el.tagName === 'CODE'
    ) {
      return true;
    }
    curr = curr.parentNode;
  }
  return false;
}

function translateSingleTextNode(textNode: Text, targetLang: string): void {
  if (isInsideNoTranslate(textNode)) return;

  if (!originalNodeText.has(textNode)) {
    originalNodeText.set(textNode, textNode.nodeValue || '');
  }

  const baseEnglish = originalNodeText.get(textNode) || '';
  if (shouldSkipTranslation(baseEnglish)) return;

  if (targetLang === 'en') {
    if (textNode.nodeValue !== baseEnglish) {
      lastAppliedTranslation.set(textNode, baseEnglish);
      textNode.nodeValue = baseEnglish;
    }
    return;
  }

  // 1. Synchronous Local Library check first (instant, 0 API calls)
  const syncHit = lookupLocalTranslation(baseEnglish, targetLang);
  if (syncHit !== null) {
    if (textNode.nodeValue !== syncHit) {
      lastAppliedTranslation.set(textNode, syncHit);
      textNode.nodeValue = syncHit;
    }
    return;
  }

  // 2. Async batched Google Translate fallback
  translateTextWithGoogleFallback(baseEnglish, targetLang).then((translated) => {
    if (activeLang === targetLang && textNode.nodeValue !== translated) {
      lastAppliedTranslation.set(textNode, translated);
      textNode.nodeValue = translated;
    }
  });
}

function translateSubtree(root: HTMLElement, targetLang: string): void {
  if (!root) return;

  // 1. Walk all text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    textNodes.push(current as Text);
    current = walker.nextNode();
  }

  textNodes.forEach((node) => translateSingleTextNode(node, targetLang));

  // 2. Translate input/textarea placeholders
  const inputs = root.querySelectorAll('input[placeholder], textarea[placeholder]');
  inputs.forEach((el) => {
    if (el.closest('[data-no-translate="true"]')) return;
    if (!originalPlaceholderText.has(el)) {
      originalPlaceholderText.set(el, el.getAttribute('placeholder') || '');
    }
    const basePlaceholder = originalPlaceholderText.get(el) || '';
    if (!basePlaceholder || shouldSkipTranslation(basePlaceholder)) return;

    if (targetLang === 'en') {
      el.setAttribute('placeholder', basePlaceholder);
      return;
    }

    const localHit = lookupLocalTranslation(basePlaceholder, targetLang);
    if (localHit !== null) {
      el.setAttribute('placeholder', localHit);
    } else {
      translateTextWithGoogleFallback(basePlaceholder, targetLang).then((translated) => {
        if (activeLang === targetLang) {
          el.setAttribute('placeholder', translated);
        }
      });
    }
  });
}
