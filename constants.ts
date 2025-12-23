import { Era, MusicTrack } from './types';

export const FEATURE_CARDS = [
  {
    id: 'time_travel',
    title: 'Time Travel',
    description: 'Transport yourself to Vikings, Ancient Egypt, or Cyberpunk 2077 using generative AI.',
    icon: 'bolt',
    longDescription: 'Experience the thrill of chronoportation. Our advanced AI reconstructs your image while preserving your identity, placing you seamlessly into historical contexts with period-accurate clothing and lighting. Choose from over 15 distinct eras.',
    features: [
        'Instant Era Transformation',
        'Identity Preservation',
        'Period-Accurate Details',
        'High Resolution Output'
    ],
    color: 'from-cyan-400 to-blue-500',
    buttonText: 'Start Time Travel'
  },
  {
    id: 'analysis',
    title: 'Visual Analysis',
    description: 'Powered by Gemini 3 Pro to understand scene context, lighting, and expressions.',
    icon: 'sparkles',
    longDescription: 'Unlock the hidden metadata of reality. Using the multimodal capabilities of Gemini 3 Pro, ChronoBooth analyzes the semantic content of your photos, describing mood, lighting, and intricate details you might have missed.',
    features: [
        'Deep Scene Understanding',
        'Mood & Lighting Detection',
        'Keyword Tagging',
        'Real-time Feedback'
    ],
    color: 'from-purple-400 to-pink-500',
    buttonText: 'Analyze Scene'
  },
  {
    id: 'video',
    title: 'Bring to Life',
    description: 'Animate your historical portraits into high-quality videos using Google Veo.',
    icon: 'movie',
    longDescription: 'Static images are just the beginning. With Google Veo technology, transform your generated portraits into cinematic 720p or 1080p videos with realistic motion and atmosphere. Direct the scene with custom prompts.',
    features: [
        'Veo Video Generation',
        'Cinematic Motion',
        'Portrait & Landscape Support',
        'Custom Soundtracks'
    ],
    color: 'from-pink-400 to-rose-500',
    buttonText: 'Create Motion'
  }
];

export const HISTORICAL_ERAS: Era[] = [
  {
    id: 'vikings',
    name: 'Viking Age',
    description: 'Norse warrior aesthetic, furs, and fjords.',
    prompt: 'Transform this person into a fierce Viking warrior. Wear leather armor and furs. Background is a dramatic fjord landscape. Photorealistic style.',
    icon: '🪓',
    color: 'from-orange-500 to-red-700'
  },
  {
    id: 'egypt',
    name: 'Ancient Egypt',
    description: 'Pharaohs, gold jewelry, and pyramids.',
    prompt: 'Transform this person into an Ancient Egyptian noble. Wear gold jewelry, linen robes, and a nemes headdress. Background is the Pyramids of Giza. Photorealistic style.',
    icon: '🏺',
    color: 'from-yellow-400 to-amber-600'
  },
  {
    id: 'victorian',
    name: 'Victorian London',
    description: 'Top hats, corsets, and cobblestone streets.',
    prompt: 'Transform this person into a Victorian aristocrat. Wear formal 19th-century attire, top hat or bonnet. Background is a foggy London street with gas lamps. Photorealistic vintage style.',
    icon: '🎩',
    color: 'from-gray-600 to-slate-800'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk 2077',
    description: 'Neon lights, cybernetics, and future tech.',
    prompt: 'Transform this person into a Cyberpunk character from the future. Add glowing cybernetic implants and futuristic streetwear. Background is a rainy neon-lit city at night. Cinematic style.',
    icon: '🦾',
    color: 'from-cyan-400 to-purple-600'
  },
  {
    id: 'roaring20s',
    name: 'Roaring 20s',
    description: 'Flappers, jazz, and art deco.',
    prompt: 'Transform this person into a 1920s party-goer. Wear flapper dress or tuxedo. Background is an Art Deco ballroom party. Black and white photography style with high contrast.',
    icon: '🎷',
    color: 'from-emerald-700 to-teal-900'
  },
  {
    id: 'samurai',
    name: 'Feudal Japan',
    description: 'Samurai armor and cherry blossoms.',
    prompt: 'Transform this person into a Samurai warrior. Wear traditional Japanese armor (O-yoroi). Background is a temple with cherry blossoms falling. Photorealistic style.',
    icon: '⚔️',
    color: 'from-red-500 to-pink-600'
  },
  {
    id: 'wildwest',
    name: 'Wild West',
    description: 'Cowboys, saloons, and the dusty frontier.',
    prompt: 'Transform this person into a rugged cowboy or cowgirl from the American Wild West. Wear a Stetson hat, leather vest, and bandana. Background is a dusty saloon town at high noon. Photorealistic western style.',
    icon: '🤠',
    color: 'from-amber-700 to-orange-900'
  },
  {
    id: 'hippie60s',
    name: 'Summer of Love',
    description: '1960s psychedelia, tie-dye, and peace signs.',
    prompt: 'Transform this person into a 1960s hippie. Wear colorful tie-dye clothing, flower crown, and round sunglasses. Background is a psychedelic music festival with colorful patterns. Vintage Kodachrome photo style.',
    icon: '✌️',
    color: 'from-pink-400 to-yellow-400'
  },
  {
    id: 'roman',
    name: 'Roman Empire',
    description: 'Senators, gladiators, and marble columns.',
    prompt: 'Transform this person into a noble Roman citizen. Wear a white toga with gold accents and a laurel wreath. Background is the Roman Forum with marble columns. Classical painting style.',
    icon: '🏛️',
    color: 'from-stone-400 to-yellow-600'
  },
  {
    id: 'pirate',
    name: 'High Seas',
    description: 'Swashbuckling captains and open oceans.',
    prompt: 'Transform this person into a pirate captain. Wear a tricorne hat, long coat, and eye patch. Background is the deck of a wooden ship on stormy seas. Cinematic adventure style.',
    icon: '☠️',
    color: 'from-blue-800 to-slate-900'
  },
  {
    id: 'medieval',
    name: 'Medieval Kingdom',
    description: 'Knights in shining armor and stone castles.',
    prompt: 'Transform this person into a medieval knight. Wear polished plate armor with a heraldic crest. Background is a stone castle courtyard with banners waving. Epic fantasy style.',
    icon: '🛡️',
    color: 'from-slate-500 to-indigo-800'
  },
  {
    id: 'stoneage',
    name: 'Stone Age',
    description: 'Cave dwellers, animal furs, and raw nature.',
    prompt: 'Transform this person into a prehistoric cave dweller. Wear fur pelts, bone necklaces, and messy hair. Background is a lush prehistoric jungle with a cave entrance. Cinematic nature style.',
    icon: '🦴',
    color: 'from-stone-500 to-green-800'
  },
  {
    id: 'renaissance',
    name: 'Renaissance',
    description: 'Artistic mastery, velvet robes, and Italian villas.',
    prompt: 'Transform this person into a Renaissance noble. Wear rich velvet robes, ruffled collars, and a beret. Background is a balcony in Venice overlooking canals. Classical oil painting style.',
    icon: '🎨',
    color: 'from-red-700 to-yellow-600'
  },
  {
    id: 'disco',
    name: 'Disco Fever',
    description: '70s groove, sequins, and dance floors.',
    prompt: 'Transform this person into a 1970s disco star. Wear a sequined jumpsuit, bell-bottoms, and platform shoes. Background is a lit-up dance floor with a disco ball. Vibrant retro color style.',
    icon: '🕺',
    color: 'from-fuchsia-500 to-purple-600'
  },
  {
    id: 'steampunk',
    name: 'Steampunk',
    description: 'Gears, steam, brass, and invention.',
    prompt: 'Transform this person into a Steampunk inventor. Wear a leather aviator cap, brass goggles, and a corset or vest with gears. Background is a steam-powered workshop with brass pipes. Detailed fantasy style.',
    icon: '⚙️',
    color: 'from-amber-600 to-orange-800'
  },
  {
    id: 'wasteland',
    name: 'Post-Apocalyptic',
    description: 'Scavengers, dusty roads, and survival gear.',
    prompt: 'Transform this person into a post-apocalyptic survivor. Wear distressed leather armor, dust goggles, and a scarf. Background is a desert wasteland with rusted ruins. Gritty cinematic style.',
    icon: '☢️',
    color: 'from-yellow-700 to-gray-800'
  }
];

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'epic',
    name: 'Epic Adventure',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=music-for-video-epic-dramatic-cinematic-adventure-111244.mp3',
    style: 'Orchestral'
  },
  {
    id: 'chill',
    name: 'Lo-Fi Chill',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/05/audio_1311f7c75f.mp3?filename=lo-fi-hip-hop-110574.mp3',
    style: 'Relaxed'
  },
  {
    id: 'retro',
    name: 'Synthwave 80s',
    url: 'https://cdn.pixabay.com/download/audio/2023/10/12/audio_4962779538.mp3?filename=synthwave-80s-170487.mp3',
    style: 'Electronic'
  },
  {
    id: 'upbeat',
    name: 'Funky Groove',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_1d4fe60613.mp3?filename=uplifting-funky-groove-110022.mp3',
    style: 'Funk'
  }
];

export const PLACEHOLDER_IMAGE = 'https://picsum.photos/800/800';