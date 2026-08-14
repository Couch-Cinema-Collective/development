/**
 * Season categories — the browsable list a commissioner picks from, and the
 * content spine of the wiki (PLAN.md §4D).
 *
 * Source: Jack's "Movie Season Ideas" list. "Korean Cinema" and "Korean Film"
 * appeared twice and are merged here into one entry.
 *
 * Each blurb defines the category rather than selling it, and the exemplars are
 * four textbook cases — a definition by demonstration, not a best-of ranking.
 */
export type CategoryFamily =
  | "Genre"
  | "Movement"
  | "Auteur"
  | "Era"
  | "National"
  | "Craft";

export interface SeasonCategory {
  id: string;
  name: string;
  family: CategoryFamily;
  blurb: string;
  exemplars: string[];
}

export const SEASON_CATEGORIES: SeasonCategory[] = [
  {
    id: "spaghetti-westerns",
    name: "Spaghetti Westerns",
    family: "Movement",
    blurb:
      "Westerns made cheaply in Italy and Spain through the 1960s, trading American frontier myth for sun-blasted cynicism, operatic scores, and heroes with no particular morals.",
    exemplars: [
      "The Good, the Bad and the Ugly",
      "Once Upon a Time in the West",
      "Django",
      "The Great Silence",
    ],
  },
  {
    id: "japanese-animation",
    name: "Japanese Animation",
    family: "National",
    blurb:
      "Animation from Japan across all registers — children's fantasy, cyberpunk, war memoir, psychological thriller. The medium is treated as a form for any subject, not a genre for children.",
    exemplars: ["Akira", "Spirited Away", "Perfect Blue", "Grave of the Fireflies"],
  },
  {
    id: "cg-animation",
    name: "Computer-Generated Animation",
    family: "Craft",
    blurb:
      "Films animated entirely in three dimensions by computer, from the first fully CG feature onward. The craft question is whether the technology serves the story or replaces it.",
    exemplars: ["Toy Story", "WALL·E", "Spider-Man: Into the Spider-Verse", "Flow"],
  },
  {
    id: "french-new-wave",
    name: "French New Wave",
    family: "Movement",
    blurb:
      "A late-1950s revolt by French critics turned directors against studio polish — handheld cameras, location shooting, jump cuts, improvised dialogue. It rewrote what a film was allowed to look like.",
    exemplars: ["Breathless", "The 400 Blows", "Cléo from 5 to 7", "Band of Outsiders"],
  },
  {
    id: "body-horror",
    name: "Body Horror",
    family: "Genre",
    blurb:
      "Horror that locates its terror in the transformation, infection, or betrayal of the human body itself. The dread is anatomical rather than supernatural.",
    exemplars: ["The Fly", "Videodrome", "Possession", "Titane"],
  },
  {
    id: "cgi-effects",
    name: "Best CGI Effects",
    family: "Craft",
    blurb:
      "Films judged on digital effects work — how convincingly, or how imaginatively, computer imagery builds something the camera could never have photographed.",
    exemplars: ["Jurassic Park", "The Matrix", "Life of Pi", "Avatar"],
  },
  {
    id: "psychological-thrillers",
    name: "Psychological Thrillers",
    family: "Genre",
    blurb:
      "Thrillers whose tension comes from unstable minds rather than physical danger — unreliable narrators, paranoia, and the slow suspicion that the protagonist is the problem.",
    exemplars: ["Vertigo", "Repulsion", "Black Swan", "Shutter Island"],
  },
  {
    id: "apocalyptic",
    name: "Apocalyptic Films",
    family: "Genre",
    blurb:
      "The end of the world as it happens or shortly after. The interest is rarely the catastrophe itself and usually what people do once the rules stop applying.",
    exemplars: ["Mad Max: Fury Road", "Children of Men", "The Road", "Threads"],
  },
  {
    id: "sports-movies",
    name: "Sports Movies",
    family: "Genre",
    blurb:
      "Films structured around athletic competition, where the game supplies the shape — training, setback, final contest — and the real subject is usually something else entirely.",
    exemplars: ["Raging Bull", "Hoosiers", "Rocky", "Moneyball"],
  },
  {
    id: "romcom-pre-2000",
    name: "Romantic Comedies (pre-2000s)",
    family: "Era",
    blurb:
      "Romantic comedy before the millennium, when the form still ran on screwball inheritance, sharp dialogue, and obstacles that were social rather than logistical.",
    exemplars: [
      "When Harry Met Sally...",
      "Moonstruck",
      "His Girl Friday",
      "The Philadelphia Story",
    ],
  },
  {
    id: "american-lit-adaptations",
    name: "Adaptations of Classic American Literature",
    family: "Genre",
    blurb:
      "Films drawn from the American literary canon. The question every entry raises: what does the camera add that the page could not, and what does it lose?",
    exemplars: [
      "To Kill a Mockingbird",
      "The Grapes of Wrath",
      "East of Eden",
      "No Country for Old Men",
    ],
  },
  {
    id: "martial-arts",
    name: "Martial Arts & Kung Fu",
    family: "Genre",
    blurb:
      "Films built around hand-to-hand combat as choreography, where fight scenes carry the story the way songs carry a musical.",
    exemplars: [
      "Enter the Dragon",
      "Crouching Tiger, Hidden Dragon",
      "The 36th Chamber of Shaolin",
      "The Raid",
    ],
  },
  {
    id: "mockumentary",
    name: "Mockumentary",
    family: "Genre",
    blurb:
      "Fiction wearing documentary clothing — talking heads, handheld cameras, and an unseen crew — usually for comedy, occasionally for something much colder.",
    exemplars: [
      "This Is Spinal Tap",
      "Best in Show",
      "What We Do in the Shadows",
      "Man Bites Dog",
    ],
  },
  {
    id: "british-comedy",
    name: "British Comedy & Satire",
    family: "National",
    blurb:
      "British comic film, from Ealing's polite savagery to absurdist troupe work, generally organised around class, embarrassment, and institutional failure.",
    exemplars: [
      "Monty Python and the Holy Grail",
      "Kind Hearts and Coronets",
      "In the Loop",
      "Withnail and I",
    ],
  },
  {
    id: "indian-cinema",
    name: "Bollywood & Indian Cinema",
    family: "National",
    blurb:
      "Film from India, spanning the Hindi-language musical spectacle of Bombay and the very different traditions of Bengali, Tamil, and Malayalam cinema.",
    exemplars: ["Sholay", "Pather Panchali", "Lagaan", "RRR"],
  },
  {
    id: "historical-dramas",
    name: "Historical Dramas",
    family: "Genre",
    blurb:
      "Serious drama set in a reconstructed past, where the period is not decoration but the source of the constraints the characters cannot escape.",
    exemplars: ["Barry Lyndon", "Schindler's List", "The Last Emperor", "12 Years a Slave"],
  },
  {
    id: "slasher",
    name: "Slasher Movies",
    family: "Genre",
    blurb:
      "A horror subgenre organised around a masked or disfigured killer, a dwindling group of young victims, and a final survivor. Its rules are so fixed that breaking them became its own tradition.",
    exemplars: ["Halloween", "Black Christmas", "Friday the 13th", "Scream"],
  },
  {
    id: "anz-cinema",
    name: "Australian & New Zealand Cinema",
    family: "National",
    blurb:
      "Antipodean film, frequently preoccupied with landscape as antagonist, isolation, and a national self-image being argued with rather than celebrated.",
    exemplars: ["Picnic at Hanging Rock", "The Piano", "Wake in Fright", "Hunt for the Wilderpeople"],
  },
  {
    id: "supernatural-horror",
    name: "Supernatural Horror",
    family: "Genre",
    blurb:
      "Horror whose threat comes from outside the natural order — ghosts, possession, curses. The rules are unknown to the characters, which is the point.",
    exemplars: ["The Exorcist", "The Shining", "Kwaidan", "Hereditary"],
  },
  {
    id: "scorsese",
    name: "Scorsese's Filmography",
    family: "Auteur",
    blurb:
      "Martin Scorsese's six decades of Catholic guilt, male self-destruction, and restless camera movement, mostly among people who mistake violence for a career path.",
    exemplars: ["Taxi Driver", "Goodfellas", "Raging Bull", "Silence"],
  },
  {
    id: "scifi-romance",
    name: "Science Fiction Romance",
    family: "Genre",
    blurb:
      "Love stories that need a speculative premise to work — memory erasure, artificial minds, time slippage. The technology exists to make an emotional problem literal.",
    exemplars: [
      "Eternal Sunshine of the Spotless Mind",
      "Her",
      "Solaris",
      "The Fountain",
    ],
  },
  {
    id: "cold-war-paranoia",
    name: "Cold War Paranoia",
    family: "Era",
    blurb:
      "Films made under the shadow of nuclear standoff, where the enemy is unseen, the institutions are compromised, and nobody can be verified as who they claim.",
    exemplars: [
      "Dr. Strangelove",
      "The Manchurian Candidate",
      "Invasion of the Body Snatchers",
      "The Conversation",
    ],
  },
  {
    id: "scandinavian-cinema",
    name: "Scandinavian Cinema",
    family: "National",
    blurb:
      "Nordic film — long winters, longer silences, and a durable tradition of treating faith, mortality, and social hypocrisy without flinching.",
    exemplars: ["The Seventh Seal", "Persona", "Let the Right One In", "Festen"],
  },
  {
    id: "courtroom-dramas",
    name: "Courtroom Dramas",
    family: "Genre",
    blurb:
      "Films where argument is the action. The confined setting and fixed procedure force the drama into language, testimony, and what the jury is willing to believe.",
    exemplars: [
      "12 Angry Men",
      "Anatomy of a Murder",
      "Witness for the Prosecution",
      "Anatomy of a Fall",
    ],
  },
  {
    id: "korean-cinema",
    name: "Korean Cinema",
    family: "National",
    blurb:
      "South Korean film since the late 1990s, known for swinging violently between comedy, melodrama, and brutality — often within one scene — while dissecting class and institutional rot.",
    exemplars: ["Memories of Murder", "Oldboy", "Parasite", "Burning"],
  },
  {
    id: "modern-fairy-tales",
    name: "Modern Day Fairy Tales",
    family: "Genre",
    blurb:
      "Fairy-tale logic transplanted into the contemporary world — enchantment, moral tests, and transformation, without the medieval dressing.",
    exemplars: ["Pan's Labyrinth", "Edward Scissorhands", "Amélie", "The Shape of Water"],
  },
  {
    id: "coen-brothers",
    name: "Coen Brothers Filmography",
    family: "Auteur",
    blurb:
      "Joel and Ethan Coen have spent four decades braiding crime, slapstick, and Old Testament fatalism. Their films are meticulously composed and deeply unwilling to reassure you.",
    exemplars: ["Fargo", "No Country for Old Men", "The Big Lebowski", "Barton Fink"],
  },
  {
    id: "film-noir",
    name: "Film Noir",
    family: "Movement",
    blurb:
      "American crime film of the 1940s and '50s defined by low-key lighting, doomed men, and a moral universe with no clean exit. Named by French critics after the fact.",
    exemplars: ["Double Indemnity", "The Third Man", "Out of the Past", "Touch of Evil"],
  },
  {
    id: "superhero",
    name: "Superhero Movies",
    family: "Genre",
    blurb:
      "Films about costumed figures with abilities beyond the ordinary. A century-old pulp form that became the dominant commercial mode of modern cinema.",
    exemplars: ["The Dark Knight", "Superman", "Spider-Man 2", "Logan"],
  },
  {
    id: "shakespeare",
    name: "Shakespeare Adaptations",
    family: "Genre",
    blurb:
      "Shakespeare on film, from reverent stagings to complete transpositions into other eras and languages. The text is fixed; everything else is up for argument.",
    exemplars: ["Throne of Blood", "Ran", "Henry V", "Romeo + Juliet"],
  },
  {
    id: "spy-thriller",
    name: "Spy Thrillers",
    family: "Genre",
    blurb:
      "Espionage on film, split between glamorous fantasy and the colder tradition where tradecraft is bureaucratic, morally soiled, and mostly waiting.",
    exemplars: [
      "Tinker Tailor Soldier Spy",
      "The Spy Who Came in from the Cold",
      "The Lives of Others",
      "Munich",
    ],
  },
  {
    id: "dystopian",
    name: "Dystopian Movies",
    family: "Genre",
    blurb:
      "Futures organised around control. The society functions — that is the horror — and the protagonist's crime is usually noticing.",
    exemplars: ["Brazil", "Nineteen Eighty-Four", "Snowpiercer", "THX 1138"],
  },
  {
    id: "hitchcock",
    name: "Alfred Hitchcock Filmography",
    family: "Auteur",
    blurb:
      "Fifty years of engineered suspense, voyeurism, and wrongly accused men. Hitchcock treated the audience's nerves as the material he was actually working in.",
    exemplars: ["Vertigo", "Rear Window", "Psycho", "North by Northwest"],
  },
  {
    id: "murder-mysteries",
    name: "Murder Mysteries",
    family: "Genre",
    blurb:
      "A body, a closed circle of suspects, and a detective. The pleasure is structural: the answer must be both surprising and, in retrospect, inevitable.",
    exemplars: [
      "Knives Out",
      "Murder on the Orient Express",
      "The Last of Sheila",
      "Gosford Park",
    ],
  },
  {
    id: "hand-drawn-animation",
    name: "Hand-Drawn Animation",
    family: "Craft",
    blurb:
      "Animation drawn frame by frame, whether on cels or paper. The line itself carries expression in a way no rendering engine has replicated.",
    exemplars: ["Princess Mononoke", "Akira", "Persepolis", "The Iron Giant"],
  },
  {
    id: "heist-films",
    name: "Heist Films",
    family: "Genre",
    blurb:
      "The assembly of a crew, the plan, the execution, and the thing that goes wrong. Process is the entertainment; the money rarely matters.",
    exemplars: ["Rififi", "The Killing", "Heat", "Ocean's Eleven"],
  },
  {
    id: "wes-anderson",
    name: "Wes Anderson's Filmography",
    family: "Auteur",
    blurb:
      "Symmetrical frames, flattened affect, and elaborate dollhouse worlds concealing genuine grief. The precision is a defence mechanism the films keep admitting to.",
    exemplars: [
      "The Royal Tenenbaums",
      "The Grand Budapest Hotel",
      "Fantastic Mr. Fox",
      "Rushmore",
    ],
  },
  {
    id: "found-footage",
    name: "Found Footage",
    family: "Craft",
    blurb:
      "Films presented as recovered recordings. The conceit imposes real limits — no score, no coverage, no camera anyone could not have been holding.",
    exemplars: [
      "The Blair Witch Project",
      "Cannibal Holocaust",
      "REC",
      "Paranormal Activity",
    ],
  },
  {
    id: "middle-eastern-cinema",
    name: "Middle Eastern Cinema",
    family: "National",
    blurb:
      "Film from across the Middle East, including an Iranian tradition that turned censorship into a formal method — children as protagonists, documentary ambiguity, endings withheld.",
    exemplars: [
      "A Separation",
      "Close-Up",
      "Where Is the Friend's House?",
      "Wadjda",
    ],
  },
  {
    id: "spike-lee",
    name: "Spike Lee's Filmography",
    family: "Auteur",
    blurb:
      "Four decades of American race, class, and neighbourhood, delivered with direct address, saturated colour, and a refusal to resolve arguments the country has not resolved.",
    exemplars: ["Do the Right Thing", "Malcolm X", "25th Hour", "BlacKkKlansman"],
  },
  {
    id: "war-films",
    name: "War Films",
    family: "Genre",
    blurb:
      "Combat on film, spanning recruitment-poster heroism and the far larger tradition arguing that the experience cannot be honestly filmed at all.",
    exemplars: [
      "Apocalypse Now",
      "Come and See",
      "Paths of Glory",
      "The Thin Red Line",
    ],
  },
  {
    id: "golden-age-musicals",
    name: "Golden Age Movie Musicals",
    family: "Era",
    blurb:
      "The studio musical at its height, roughly 1930 to 1960, when song and dance were shot as spectacle in long takes by performers who could actually do it.",
    exemplars: [
      "Singin' in the Rain",
      "The Band Wagon",
      "Top Hat",
      "West Side Story",
    ],
  },
  {
    id: "zombie",
    name: "Zombie Movies",
    family: "Genre",
    blurb:
      "The walking dead as a siege engine and a social x-ray. The monsters are slow and stupid; the survivors supply the actual threat.",
    exemplars: [
      "Night of the Living Dead",
      "Dawn of the Dead",
      "28 Days Later",
      "Train to Busan",
    ],
  },
  {
    id: "action",
    name: "Action Movies",
    family: "Genre",
    blurb:
      "Films where physical spectacle is the primary text. The craft question is legibility: can you tell what is happening, to whom, and why it matters.",
    exemplars: ["Die Hard", "Mad Max: Fury Road", "Hard Boiled", "John Wick"],
  },
  {
    id: "james-bond",
    name: "James Bond Movies",
    family: "Genre",
    blurb:
      "Sixty years of one character across six actors — a franchise that doubles as a record of what each era wanted its ideal man to be.",
    exemplars: ["Goldfinger", "On Her Majesty's Secret Service", "Casino Royale", "Skyfall"],
  },
  {
    id: "samurai",
    name: "Samurai Movies (Jidaigeki)",
    family: "Genre",
    blurb:
      "Japanese period drama set in the feudal era, typically concerned with duty, obsolescence, and men whose code has outlived the world that needed it.",
    exemplars: ["Seven Samurai", "Harakiri", "Yojimbo", "The Sword of Doom"],
  },
  {
    id: "romantic-period-piece",
    name: "Romantic Period Pieces",
    family: "Genre",
    blurb:
      "Love constrained by the manners of its era. Restraint does the work — what cannot be said aloud carries more than any declaration.",
    exemplars: [
      "Portrait of a Lady on Fire",
      "In the Mood for Love",
      "Pride & Prejudice",
      "The Age of Innocence",
    ],
  },
  {
    id: "crime-thriller",
    name: "Crime Thrillers",
    family: "Genre",
    blurb:
      "Films built on criminal enterprise and pursuit, generally more interested in the systems that produce crime than in solving any particular one.",
    exemplars: ["Se7en", "Zodiac", "The Departed", "Infernal Affairs"],
  },
  {
    id: "eastern-bloc",
    name: "Eastern Bloc Cinema (1945–1989)",
    family: "Era",
    blurb:
      "Film made under state socialism in Central and Eastern Europe, where allegory, absurdism, and deliberate obscurity were the working conditions of getting anything past a censor.",
    exemplars: ["Ashes and Diamonds", "Daisies", "Stalker", "The Cremator"],
  },
  {
    id: "godzilla",
    name: "Godzilla Movies",
    family: "Genre",
    blurb:
      "Seventy years of a single monster, beginning as an unambiguous nuclear allegory and mutating into children's spectacle and back again.",
    exemplars: ["Godzilla (1954)", "Shin Godzilla", "Godzilla Minus One", "Mothra vs. Godzilla"],
  },
  {
    id: "fantasy",
    name: "Fantasy",
    family: "Genre",
    blurb:
      "Secondary worlds with their own consistent rules. The genre lives or dies on whether the invented logic holds under pressure.",
    exemplars: [
      "The Lord of the Rings: The Fellowship of the Ring",
      "Pan's Labyrinth",
      "Legend",
      "The Princess Bride",
    ],
  },
  {
    id: "satire-parody",
    name: "Satire & Parody",
    family: "Genre",
    blurb:
      "Comedy aimed at a target. Parody imitates a form to expose it; satire uses the form to attack something outside the film entirely.",
    exemplars: ["Dr. Strangelove", "Airplane!", "Network", "Blazing Saddles"],
  },
  {
    id: "american-western",
    name: "American Western Cinema",
    family: "Genre",
    blurb:
      "The founding American genre — frontier, law, and the violence underwriting settlement. It spent its second half arguing with everything it established in the first.",
    exemplars: ["The Searchers", "Unforgiven", "Red River", "McCabe & Mrs. Miller"],
  },
  {
    id: "ancient-era",
    name: "Ancient Era Movies",
    family: "Era",
    blurb:
      "Films set in classical antiquity and earlier — empire, myth, and the logistics of spectacle before gunpowder.",
    exemplars: ["Ben-Hur", "Spartacus", "Gladiator", "The Ten Commandments"],
  },
  {
    id: "folk-horror",
    name: "Folk & Pagan Horror",
    family: "Genre",
    blurb:
      "Horror rooted in landscape, isolated communities, and old belief systems that never fully went away. The outsider arrives, and the locals are perfectly friendly.",
    exemplars: ["The Wicker Man", "Midsommar", "Witchfinder General", "The Witch"],
  },
  {
    id: "broadway-adaptations",
    name: "Broadway Musical Adaptations",
    family: "Genre",
    blurb:
      "Stage musicals transferred to film, and the permanent problem that comes with it: what to do with a form built for a live room and a fixed proscenium.",
    exemplars: ["Cabaret", "Chicago", "Fiddler on the Roof", "Little Shop of Horrors"],
  },
  {
    id: "biopics",
    name: "Biopics",
    family: "Genre",
    blurb:
      "Lives compressed into three acts. The interesting entries refuse the cradle-to-grave shape and take one episode seriously instead.",
    exemplars: ["Lawrence of Arabia", "Amadeus", "The Social Network", "I'm Not There"],
  },
  {
    id: "alien-encounter",
    name: "Alien Encounter Movies",
    family: "Genre",
    blurb:
      "First contact, in every register from wonder to infestation. What the aliens want is usually a proxy for what the film thinks of humanity.",
    exemplars: ["Close Encounters of the Third Kind", "Arrival", "Alien", "The Thing"],
  },
  {
    id: "natural-disaster",
    name: "Natural Disaster Movies",
    family: "Genre",
    blurb:
      "Catastrophe as spectacle and as social test — the ensemble cast exists so the disaster can sort them.",
    exemplars: ["The Towering Inferno", "Twister", "The Impossible", "Deepwater Horizon"],
  },
  {
    id: "book-adaptations",
    name: "Book Adaptations",
    family: "Genre",
    blurb:
      "Novels into film, and the fidelity argument that follows every one. The best adaptations are usually the least reverent.",
    exemplars: ["The Godfather", "Jaws", "Blade Runner", "Arrival"],
  },
  {
    id: "best-remake",
    name: "Best Remake",
    family: "Craft",
    blurb:
      "Films that took another film's premise and justified doing it again — by relocating it, inverting it, or finally getting it right.",
    exemplars: ["The Thing", "Heat", "True Grit", "A Fistful of Dollars"],
  },
  {
    id: "sword-and-sandals",
    name: "Sword and Sandals",
    family: "Genre",
    blurb:
      "The peplum — muscular heroes, ancient settings, and a low-budget Italian tradition that ran parallel to Hollywood's prestige epics.",
    exemplars: ["Hercules", "Jason and the Argonauts", "Conan the Barbarian", "300"],
  },
  {
    id: "best-sequels",
    name: "Best Sequels",
    family: "Craft",
    blurb:
      "Second films that expanded rather than repeated. The rare ones make the original look like a first draft.",
    exemplars: [
      "The Godfather Part II",
      "Aliens",
      "The Empire Strikes Back",
      "Mad Max 2",
    ],
  },
  {
    id: "franchise-debut",
    name: "Best Movie Franchise Debut",
    family: "Craft",
    blurb:
      "First entries that established a whole world — judged on what they built before anyone knew there would be more.",
    exemplars: ["Alien", "Star Wars", "The Terminator", "Batman Begins"],
  },
  {
    id: "practical-effects",
    name: "Best Practical Effects",
    family: "Craft",
    blurb:
      "Effects achieved in front of the lens — animatronics, prosthetics, miniatures, stunts. Everything is physically present, which is why it still holds up.",
    exemplars: ["The Thing", "Jurassic Park", "Mad Max: Fury Road", "Alien"],
  },
];

export const CATEGORIES_BY_ID = new Map(
  SEASON_CATEGORIES.map((c) => [c.id, c]),
);

export const CATEGORY_FAMILIES: CategoryFamily[] = [
  "Genre",
  "Movement",
  "Auteur",
  "Era",
  "National",
  "Craft",
];
