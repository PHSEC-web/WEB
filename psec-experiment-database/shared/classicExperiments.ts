export type Discipline =
  | "Social Psychology"
  | "Behavioral Economics"
  | "Sociology"
  | "Moral & Political Philosophy";

export type ClassicExperiment = {
  slug: string;
  discipline: Discipline;
  title: string;
  category: "Academic Reference Library";
  theoreticalBasis: string;
  historicalBackground: string;
  hypothesis: string;
  procedure: string;
  author: string;
  status: "archived";
};

export const CLASSIC_EXPERIMENTS: ClassicExperiment[] = [
  {
    slug: "asch-conformity",
    discipline: "Social Psychology",
    title: "Asch Conformity Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Normative social influence and group conformity theory; the distinction between public compliance and private acceptance.",
    historicalBackground: "Designed by Solomon E. Asch (1907–1996), a Polish-born American Gestalt psychologist at Swarthmore College. Created in the early 1950s and published formally in 1955–1956, it was motivated by post-WWII reflections on mass public conformity. Asch criticized Muzafer Sherif’s earlier ambiguous-conformity research and used unambiguous line judgments to isolate group pressure rather than informational uncertainty. Funded by the U.S. Office of Naval Research, the study surprised Asch and reshaped thinking about the power of a group over individual judgment.",
    hypothesis: "Participants will sometimes publicly agree with an obviously incorrect majority even when their private perception remains unchanged.",
    procedure: "A naive participant completes line-length judgments alongside confederates who unanimously choose an incorrect answer on critical trials.",
    author: "Solomon E. Asch",
    status: "archived",
  },
  {
    slug: "labeling-effect",
    discipline: "Social Psychology",
    title: "Labeling Effect Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Self-concept theory and social labeling theory: externally assigned identities can reshape self-perception and behavioral output.",
    historicalBackground: "Rooted in George Herbert Mead’s early-twentieth-century symbolic interactionism, then extended by Howard Becker’s 1963 work on deviance. Small-scale laboratory validations in 1970–1980 explored whether labels merely describe behavior or become causal forces that reconstruct identity and subsequent choices.",
    hypothesis: "Participants who receive a salient positive or negative label will alter later choices in the direction of that label.",
    procedure: "Assign participants a randomized identity cue, give them neutral decision tasks, and compare behavior across label conditions while controlling for baseline attitudes.",
    author: "Symbolic interactionist tradition",
    status: "archived",
  },
  {
    slug: "stereotype-threat",
    discipline: "Social Psychology",
    title: "Stereotype Threat Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Stereotype threat theory: awareness of a negative group stereotype can impair task performance independently of actual ability.",
    historicalBackground: "Created by Claude Steele and Joshua Aronson at Stanford University; the landmark paper appeared in 1995 in the Journal of Personality and Social Psychology. Their GRE-verbal test experiments showed that simply activating a negative social-group stereotype could suppress performance, triggering decades of follow-up work across gender, age, and social categories.",
    hypothesis: "Making a negative stereotype salient will reduce performance on a difficult cognitive task for members of the stereotyped group.",
    procedure: "Randomly frame an identical assessment as diagnostic or non-diagnostic of ability, then compare accuracy and completion time across identity groups.",
    author: "Claude Steele & Joshua Aronson",
    status: "archived",
  },
  {
    slug: "prisoners-dilemma",
    discipline: "Behavioral Economics",
    title: "Prisoner’s Dilemma",
    category: "Academic Reference Library",
    theoreticalBasis: "Game theory and Nash equilibrium: structural conflict between individual rational self-interest and collective welfare.",
    historicalBackground: "Devised in 1950 by Merrill Flood and Melvin Dresher at RAND during Cold-War strategic research. Albert Tucker later added the famous prison-sentence narrative for lecture audiences. Early human test runs took place in 1950, with formal RAND reports in 1952, making the paradigm a bridge between mathematical strategy and behavioral observation.",
    hypothesis: "In a one-shot interaction, individual incentives will push participants toward defection even when mutual cooperation would yield a better collective outcome.",
    procedure: "Pair participants for anonymous simultaneous choices between cooperation and defection, then vary payoffs and repetition to study trust and retaliation.",
    author: "Merrill Flood & Melvin Dresher",
    status: "archived",
  },
  {
    slug: "ultimatum-game",
    discipline: "Behavioral Economics",
    title: "Ultimatum Game",
    category: "Academic Reference Library",
    theoreticalBasis: "Fairness-preference theory: people may reject unequal positive-value offers even at personal material cost.",
    historicalBackground: "First formal human-subject implementation by Werner Güth, Rolf Schmittberger, and Bernd Schwarze in 1982 at Humboldt-Universität Berlin. Earlier bargaining sketches existed in 1960s game theory, but the team produced the first real-player dataset and helped establish behavioral economics as an empirical challenge to pure homo economicus assumptions.",
    hypothesis: "Responders will reject materially positive offers when the proposer’s allocation is perceived as unfair.",
    procedure: "A proposer divides a fixed monetary stake; a responder accepts or rejects the offer, with rejection leaving both parties at zero.",
    author: "Werner Güth, Rolf Schmittberger & Bernd Schwarze",
    status: "archived",
  },
  {
    slug: "public-goods-game",
    discipline: "Behavioral Economics",
    title: "Public Goods Game",
    category: "Academic Reference Library",
    theoreticalBasis: "The free-rider problem and collective resource contribution theory: private self-interest can conflict with shared benefit.",
    historicalBackground: "Evolved from Mancur Olson’s 1965 Logic of Collective Action. Controlled laboratory implementations developed in the late 1970s and early 1980s to test whether rational individuals would under-contribute to shared resources. It became a standard paradigm for studying voluntary cooperation across cultures and subject pools.",
    hypothesis: "Average contributions will fall below the socially optimal level as participants anticipate that others can free-ride.",
    procedure: "Give each participant an endowment to keep or contribute to a group account, then return a shared multiplier to the group.",
    author: "Experimental economics tradition",
    status: "archived",
  },
  {
    slug: "social-status-labeling",
    discipline: "Sociology",
    title: "Social Status Labeling Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Social stratification theory: visible status hierarchies shape interpersonal trust, attention allocation, and evaluation.",
    historicalBackground: "Builds on Max Weber’s writing on status, prestige, and social honor. Early lab operationalizations emerged in 1950s small-group sociology at the University of Michigan, moving beyond observation toward controlled tests where status cues could be manipulated independently of talent or merit.",
    hypothesis: "Visible status cues will influence who receives attention and trust even when task performance is held constant.",
    procedure: "Randomly assign status markers before a group task, record speaking time and evaluations, and compare treatment groups with identical performance information.",
    author: "Small-group sociology tradition",
    status: "archived",
  },
  {
    slug: "group-polarization",
    discipline: "Sociology",
    title: "Group Polarization Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Group polarization and social-comparison theory: discussion can shift individual attitudes toward more extreme collective positions.",
    historicalBackground: "First robust empirical documentation by Serge Moscovici and Marisa Zavalloni in 1969. The work built on the 1960s risky-shift finding and showed the effect was general: groups amplified pre-existing attitudes, not only risk-taking. It reshaped analysis of deliberation, public opinion, and political radicalization.",
    hypothesis: "After discussion, group members will express positions that are more extreme in the direction of their initial average attitude.",
    procedure: "Measure individual attitudes, facilitate a structured group discussion, then repeat the scale and compare within-person movement.",
    author: "Serge Moscovici & Marisa Zavalloni",
    status: "archived",
  },
  {
    slug: "bystander-effect",
    discipline: "Sociology",
    title: "Bystander Effect Experiment",
    category: "Academic Reference Library",
    theoreticalBasis: "Diffusion of responsibility: the presence of other potential helpers can reduce each individual’s subjective obligation to intervene.",
    historicalBackground: "Created by John Darley and Bibb Latané and published in 1968 after the widely reported 1964 Kitty Genovese case. Their smoke-filled-room and seizure-simulation studies rejected simple urban-apathy explanations and demonstrated a structural effect of perceived group presence. Later reassessments corrected inaccuracies in the original news report, while the experimental question remained influential.",
    hypothesis: "Participants will be slower or less likely to help when they believe more other witnesses are present.",
    procedure: "Create a staged emergency, vary the number of apparent witnesses, and record the time to report or intervene.",
    author: "John Darley & Bibb Latané",
    status: "archived",
  },
  {
    slug: "trolley-problem",
    discipline: "Moral & Political Philosophy",
    title: "Trolley Problem",
    category: "Academic Reference Library",
    theoreticalBasis: "Utilitarianism versus deontology: competing normative frameworks for evaluating harm and moral trade-offs.",
    historicalBackground: "The basic scenario was formulated by Philippa Foot in 1967 while discussing abortion and the doctrine of double effect. Judith Jarvis Thomson expanded the thought-experiment format in 1976 with the famous footbridge variant. Its purpose was to test intuitive judgment against formal ethical theories before migrating into large-scale behavioral research.",
    hypothesis: "People will distinguish between redirecting harm and directly using a person as a means, producing different judgments despite equal arithmetic outcomes.",
    procedure: "Present matched moral dilemmas that vary action, intention, and physical contact, then collect judgments and reasoning explanations.",
    author: "Philippa Foot & Judith Jarvis Thomson",
    status: "archived",
  },
  {
    slug: "veil-of-ignorance",
    discipline: "Moral & Political Philosophy",
    title: "Veil of Ignorance",
    category: "Academic Reference Library",
    theoreticalBasis: "John Rawls’s theory of justice as fairness: an impartial procedure for constructing social-distribution rules.",
    historicalBackground: "Developed by Harvard political philosopher John Rawls. Early ideas appeared in his 1958 essay Justice as Fairness and were fully elaborated in A Theory of Justice (1971). Rawls adapted social-contract traditions from Locke and Rousseau, asking decision-makers to choose institutions without knowing their wealth, talent, gender, or social rank.",
    hypothesis: "Removing information about one’s future social position will increase support for rules that protect the least advantaged.",
    procedure: "Ask participants to allocate social resources from an original position in which their own future status is hidden, then compare choices with informed conditions.",
    author: "John Rawls",
    status: "archived",
  },
  {
    slug: "moral-prisoners-dilemma",
    discipline: "Moral & Political Philosophy",
    title: "Moral Prisoner Dilemma",
    category: "Academic Reference Library",
    theoreticalBasis: "Ethical egoism and moral obligation: conflict between individual self-interest and consistent moral compliance.",
    historicalBackground: "Synthesized from the game-theory prisoner dilemma and moral-philosophy debates reaching back to Plato’s Republic. Modern formal treatment grew in 1970–1980 ethics literature, using the strategic model as a testbed for whether rational self-interest can support moral behavior when defection offers large personal rewards.",
    hypothesis: "When personal rewards for defection increase, participants will report a growing conflict between what benefits them and what they regard as morally required.",
    procedure: "Pair strategic payoffs with moral framing, collect choices and post-task justifications, and compare behavior across neutral and ethical wording.",
    author: "Modern ethics and game-theory tradition",
    status: "archived",
  },
];

export const DISCIPLINES = [
  { name: "Social Psychology" as Discipline, short: "Behavior, identity & influence", icon: "02" },
  { name: "Behavioral Economics" as Discipline, short: "Choice, incentives & cooperation", icon: "03" },
  { name: "Sociology" as Discipline, short: "Groups, status & public life", icon: "04" },
  { name: "Moral & Political Philosophy" as Discipline, short: "Justice, ethics & judgment", icon: "05" },
] as const;

export const LIBRARY_CATEGORIES = [
  "Idea Pool",
  "Formal Experimental Designs",
  "Completed Experimental Projects",
  "Academic Reference Library",
] as const;
