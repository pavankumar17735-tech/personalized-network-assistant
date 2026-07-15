import { UserProfile } from './types.ts';

export interface PresetProfile {
  label: string;
  profile: UserProfile;
  eventDescription: string;
}

export const PRESET_PROFILES: PresetProfile[] = [
  {
    label: 'Dr. Elena Rostova (ML Researcher)',
    profile: {
      name: 'Dr. Elena Rostova',
      role: 'Senior Research Scientist in AI/ML',
      professionalInterests: ['Deep Learning', 'Generative AI', 'Computer Vision', 'Graph Neural Networks'],
      personalInterests: ['Hiking', 'Classical Piano', 'Astronomy'],
      bio: 'Elena is a machine learning researcher focused on multi-modal vision-language models. She recently published work on graph neural networks for molecules and loves discussing AI ethics and academic-to-industry transition.'
    },
    eventDescription: 'International Joint Conference on Artificial Intelligence (IJCAI). Key sessions include Multi-Agent Systems, Generative Image Models, Ethics and Safe AI panel, and Industry Networking hour.'
  },
  {
    label: 'Marcus Sterling (SaaS Architect)',
    profile: {
      name: 'Marcus Sterling',
      role: 'Principal SaaS Cloud Architect',
      professionalInterests: ['Serverless Architectures', 'Multi-tenant Databases', 'Kubernetes', 'API Security'],
      personalInterests: ['Sailing', 'Bouldering', 'Espresso Brewing'],
      bio: 'Marcus designs secure, scalable multi-tenant SaaS platforms. He has spent 10+ years in distributed systems, actively contributes to open-source cloud-native projects, and is keen to connect with founders building high-performance B2B applications.'
    },
    eventDescription: 'SaaS Enterprise Summit. Topics include Cloud Costs Optimization, Zero-Trust API design, Kubernetes in Production at scale, and B2B Startup Funding panels.'
  }
];

export const SAMPLE_FACT_CHECKS = [
  {
    query: "Guido van Rossum invented Python",
    status: "Verified",
    summary: "Guido van Rossum is a Dutch programmer best known as the creator of the Python programming language, which he released in 1991.",
    explanation: "Wikipedia confirms that Guido van Rossum began designing Python in December 1989 and launched it as an open-source project in February 1991.",
    sourceUrl: "https://en.wikipedia.org/wiki/Guido_van_Rossum",
    confidence: 1.0
  },
  {
    query: "Kubernetes was originally designed by Microsoft",
    status: "Disputed",
    summary: "Kubernetes was originally designed and developed by Google before being donated to the Cloud Native Computing Foundation (CNCF).",
    explanation: "Wikipedia records that Kubernetes (often abbreviated as K8s) was announced by Google mid-2014, drawing heavily on their internal cluster management system Borg, and was not designed by Microsoft.",
    sourceUrl: "https://en.wikipedia.org/wiki/Kubernetes",
    confidence: 0.98
  },
  {
    query: "Graph neural networks can predict molecular properties",
    status: "Verified",
    summary: "Graph neural networks (GNNs) are widely applied to represent molecular graphs and predict chemical, biological, and physical molecular properties.",
    explanation: "Wikipedia details that representing atoms as nodes and chemical bonds as edges allows GNNs to run message-passing algorithms to compute property predictions for organic compounds.",
    sourceUrl: "https://en.wikipedia.org/wiki/Graph_neural_network",
    confidence: 0.95
  }
];
