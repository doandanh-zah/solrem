import { ResourceItem } from './types';

export const RESOURCES: ResourceItem[] = [
  {
    id: 'r1',
    type: 'ARTICLE',
    title: 'The Science of REM: Why Dreaming Matters',
    description:
      'Understand how Rapid Eye Movement consolidates memory and regulates emotions.',
    author: 'Dr. Matt Walker',
    duration: '6 min read',
    link: 'https://google.com',
    thumbnailColor: 'from-blue-600 to-indigo-900',
  },
  {
    id: 'r2',
    type: 'VIDEO',
    title: 'Sleep Toolkit: Tools for Perfect Sleep',
    description:
      'Key protocols to set your circadian rhythm and improve sleep efficiency.',
    author: 'Huberman Lab',
    duration: '15:20',
    link: 'https://youtube.com',
    thumbnailColor: 'from-gray-900 to-black',
  },
  {
    id: 'r3',
    type: 'PODCAST',
    title: 'Caffeine, Alcohol & Sleep Architecture',
    description:
      'How substances affect your sleep stages and what timing works best.',
    author: 'Peter Attia',
    duration: '45:00',
    link: 'https://spotify.com',
    thumbnailColor: 'from-green-900 to-emerald-950',
  },
  {
    id: 'r4',
    type: 'ARTICLE',
    title: 'Temperature Control for Deep Sleep',
    description:
      'Why cooling down your body is essential for entering deep sleep stages.',
    author: 'Sleep Foundation',
    duration: '4 min read',
    link: 'https://google.com',
    thumbnailColor: 'from-orange-700 to-red-900',
  },
];
