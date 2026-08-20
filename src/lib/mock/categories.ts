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
  {
    id: "mexican-cinema",
    name: "Mexican Cinema",
    family: "National",
    blurb:
      "From the studio melodramas of the Golden Age to the international run of the three amigos, a national cinema that keeps rediscovering how to make the intimate feel enormous.",
    exemplars: [
      "Roma",
      "Y Tu Mamá También",
      "Amores Perros",
      "Los Olvidados",
    ],
  },
  {
    id: "hong-kong-action",
    name: "Hong Kong Action Cinema",
    family: "National",
    blurb:
      "Choreography as authorship. Stunt teams and wire work pushed the action sequence from a plot obligation into the reason the film exists, and half of Hollywood has been borrowing from it since.",
    exemplars: [
      "Hard Boiled",
      "Police Story",
      "A Better Tomorrow",
      "Infernal Affairs",
    ],
  },
  {
    id: "iranian-cinema",
    name: "Iranian Cinema",
    family: "National",
    blurb:
      "Films made under censorship that turned restriction into method: children as protagonists, documentary textures, and endings that hand the judgement to the audience.",
    exemplars: [
      "Close-Up",
      "A Separation",
      "Taste of Cherry",
      "Children of Heaven",
    ],
  },
  {
    id: "brazilian-cinema",
    name: "Brazilian Cinema",
    family: "National",
    blurb:
      "Cinema Novo and its descendants — hunger, favela, sertão — filmed with a hand-held urgency that treats poverty as a subject rather than a backdrop.",
    exemplars: [
      "City of God",
      "Black God, White Devil",
      "Central Station",
      "Bacurau",
    ],
  },
  {
    id: "nollywood",
    name: "Nigerian Cinema (Nollywood)",
    family: "National",
    blurb:
      "The most prolific film industry on earth by volume, built on direct-to-video economics and a melodramatic register that answers to its own audience rather than to festivals.",
    exemplars: [
      "Lionheart",
      "The Figurine",
      "Living in Bondage",
      "King of Boys",
    ],
  },
  {
    id: "spanish-cinema",
    name: "Spanish Cinema",
    family: "National",
    blurb:
      "Post-Franco cinema that went straight for the repressed: colour-saturated melodrama, Catholic guilt, and horror that treats the civil war as the original wound.",
    exemplars: [
      "Pan's Labyrinth",
      "All About My Mother",
      "The Spirit of the Beehive",
      "Volver",
    ],
  },
  {
    id: "german-cinema",
    name: "German Cinema",
    family: "National",
    blurb:
      "A cinema twice rebuilt from ruins — Weimar experiment, then the New German Cinema of the seventies, then reunification — and permanently interested in complicity.",
    exemplars: [
      "Wings of Desire",
      "Aguirre, the Wrath of God",
      "The Lives of Others",
      "Run Lola Run",
    ],
  },
  {
    id: "soviet-russian-cinema",
    name: "Soviet & Russian Cinema",
    family: "National",
    blurb:
      "From montage theory to the long take as an act of faith: a tradition that treats duration itself as the medium's most serious tool.",
    exemplars: [
      "Stalker",
      "Come and See",
      "Andrei Rublev",
      "Battleship Potemkin",
    ],
  },
  {
    id: "taiwanese-cinema",
    name: "Taiwanese Cinema",
    family: "National",
    blurb:
      "The New Taiwan Cinema and after: static frames, extended silences, and family histories that carry the island's political history without ever stating it.",
    exemplars: [
      "Yi Yi",
      "A Brighter Summer Day",
      "A City of Sadness",
      "Rebels of the Neon God",
    ],
  },
  {
    id: "west-african-cinema",
    name: "West African Cinema",
    family: "National",
    blurb:
      "Sembène onward — films made in African languages for African audiences, using folklore, satire and long takes to argue about independence and what followed it.",
    exemplars: [
      "Touki Bouki",
      "Black Girl",
      "Yeelen",
      "Timbuktu",
    ],
  },
  {
    id: "kubrick",
    name: "Stanley Kubrick Filmography",
    family: "Auteur",
    blurb:
      "A dozen films across a dozen genres, each one a cold, symmetrical machine built to demonstrate that institutions are more frightening than monsters.",
    exemplars: [
      "2001: A Space Odyssey",
      "The Shining",
      "Dr. Strangelove",
      "Barry Lyndon",
    ],
  },
  {
    id: "kurosawa",
    name: "Akira Kurosawa Filmography",
    family: "Auteur",
    blurb:
      "Weather as emotion, movement as character, and the wipe cut as a signature. The films Hollywood has been remaking for seventy years without quite matching.",
    exemplars: [
      "Seven Samurai",
      "Rashomon",
      "Ikiru",
      "Ran",
    ],
  },
  {
    id: "miyazaki",
    name: "Hayao Miyazaki Filmography",
    family: "Auteur",
    blurb:
      "Hand-drawn animation that refuses villains, gives its heroines the work, and stops the plot dead whenever something is worth looking at.",
    exemplars: [
      "Spirited Away",
      "My Neighbor Totoro",
      "Princess Mononoke",
      "Howl's Moving Castle",
    ],
  },
  {
    id: "tarantino",
    name: "Quentin Tarantino Filmography",
    family: "Auteur",
    blurb:
      "Genre pastiche assembled by a video-store memory: chapter headings, digressive dialogue, and violence that arrives after a very long wait.",
    exemplars: [
      "Pulp Fiction",
      "Inglourious Basterds",
      "Kill Bill: Vol. 1",
      "Jackie Brown",
    ],
  },
  {
    id: "varda",
    name: "Agnès Varda Filmography",
    family: "Auteur",
    blurb:
      "Sixty years of films that dissolve the line between documentary and fiction, made with a curiosity about ordinary people that never curdles into condescension.",
    exemplars: [
      "Cléo from 5 to 7",
      "The Gleaners and I",
      "Vagabond",
      "Faces Places",
    ],
  },
  {
    id: "wong-kar-wai",
    name: "Wong Kar-wai Filmography",
    family: "Auteur",
    blurb:
      "Step-printed motion, saturated interiors, and characters who narrate their own longing. Mood pursued at the expense of plot, deliberately.",
    exemplars: [
      "In the Mood for Love",
      "Chungking Express",
      "Happy Together",
      "Fallen Angels",
    ],
  },
  {
    id: "bong-joon-ho",
    name: "Bong Joon-ho Filmography",
    family: "Auteur",
    blurb:
      "Tonal whiplash used as an argument: comedy, horror and social realism inside one scene, always circling class and the incompetence of institutions.",
    exemplars: [
      "Parasite",
      "Memories of Murder",
      "Mother",
      "The Host",
    ],
  },
  {
    id: "villeneuve",
    name: "Denis Villeneuve Filmography",
    family: "Auteur",
    blurb:
      "Scale and dread in equal measure — enormous frames, minimal dialogue, and a recurring interest in people trying to communicate across an unbridgeable gap.",
    exemplars: [
      "Arrival",
      "Blade Runner 2049",
      "Sicario",
      "Dune",
    ],
  },
  {
    id: "greta-gerwig",
    name: "Greta Gerwig Filmography",
    family: "Auteur",
    blurb:
      "Overlapping speech, unglamorous ambition, and heroines allowed to be both insufferable and right. Coming-of-age without the condescension.",
    exemplars: [
      "Lady Bird",
      "Little Women",
      "Barbie",
      "Frances Ha",
    ],
  },
  {
    id: "pta",
    name: "Paul Thomas Anderson Filmography",
    family: "Auteur",
    blurb:
      "Sprawling ensembles narrowed over time into two-handers about domination, all of them scored like thrillers and shot like they cost more than they did.",
    exemplars: [
      "There Will Be Blood",
      "Boogie Nights",
      "Phantom Thread",
      "Magnolia",
    ],
  },
  {
    id: "del-toro",
    name: "Guillermo del Toro Filmography",
    family: "Auteur",
    blurb:
      "Practical creature work in service of a consistent moral: the monsters are sympathetic, and the men in uniform are not.",
    exemplars: [
      "Pan's Labyrinth",
      "The Shape of Water",
      "The Devil's Backbone",
      "Crimson Peak",
    ],
  },
  {
    id: "jane-campion",
    name: "Jane Campion Filmography",
    family: "Auteur",
    blurb:
      "Landscape as psychology, and a career-long attention to desire, power and the violence men perform to stay legible to each other.",
    exemplars: [
      "The Piano",
      "The Power of the Dog",
      "Bright Star",
      "Sweetie",
    ],
  },
  {
    id: "italian-neorealism",
    name: "Italian Neorealism",
    family: "Movement",
    blurb:
      "Post-war Italy shot on location with non-professional actors, because the studios were wrecked and the subject was people with nothing. Plot reduced to circumstance.",
    exemplars: [
      "Bicycle Thieves",
      "Rome, Open City",
      "La Terra Trema",
      "Umberto D.",
    ],
  },
  {
    id: "german-expressionism",
    name: "German Expressionism",
    family: "Movement",
    blurb:
      "Weimar cinema built out of painted shadows and impossible architecture, externalising a character's derangement by warping the set around them.",
    exemplars: [
      "The Cabinet of Dr. Caligari",
      "Metropolis",
      "Nosferatu",
      "M",
    ],
  },
  {
    id: "dogme-95",
    name: "Dogme 95",
    family: "Movement",
    blurb:
      "A Danish vow of chastity: location sound, hand-held camera, no score, no props brought in. A manifesto designed to make cheating visible.",
    exemplars: [
      "Festen",
      "The Idiots",
      "Italian for Beginners",
      "Mifune's Last Song",
    ],
  },
  {
    id: "soviet-montage",
    name: "Soviet Montage",
    family: "Movement",
    blurb:
      "The theory that meaning lives in the cut rather than the shot, tested at scale on films that were also, unambiguously, propaganda.",
    exemplars: [
      "Battleship Potemkin",
      "Man with a Movie Camera",
      "Strike",
      "October",
    ],
  },
  {
    id: "czech-new-wave",
    name: "Czech New Wave",
    family: "Movement",
    blurb:
      "Absurdist comedy and non-actors under a regime that eventually banned most of it — films that argue by being funny about things that are not.",
    exemplars: [
      "Closely Watched Trains",
      "Daisies",
      "The Firemen's Ball",
      "Marketa Lazarová",
    ],
  },
  {
    id: "japanese-new-wave",
    name: "Japanese New Wave",
    family: "Movement",
    blurb:
      "A generation attacking the studio humanism that preceded it: sexual frankness, political fury, and formal experiment aimed squarely at their elders.",
    exemplars: [
      "Woman in the Dunes",
      "In the Realm of the Senses",
      "Cruel Story of Youth",
      "Branded to Kill",
    ],
  },
  {
    id: "cinema-verite",
    name: "Cinéma Vérité & Direct Cinema",
    family: "Movement",
    blurb:
      "Lightweight cameras and sync sound made it possible to simply follow someone. The argument that followed — whether the camera changes what it records — has never been settled.",
    exemplars: [
      "Salesman",
      "Chronicle of a Summer",
      "Dont Look Back",
      "Grey Gardens",
    ],
  },
  {
    id: "kitchen-sink",
    name: "British Kitchen Sink Realism",
    family: "Movement",
    blurb:
      "Angry young men in northern industrial towns, shot in grey and filled with dialogue about class that British cinema had previously kept off screen.",
    exemplars: [
      "Saturday Night and Sunday Morning",
      "A Taste of Honey",
      "Look Back in Anger",
      "Kes",
    ],
  },
  {
    id: "hong-kong-new-wave",
    name: "Hong Kong New Wave",
    family: "Movement",
    blurb:
      "Television-trained directors who brought location shooting and genre energy back to Cantonese cinema, and set up everything that followed in the eighties.",
    exemplars: [
      "Boat People",
      "The Butterfly Murders",
      "Father and Son",
      "Dangerous Encounters of the First Kind",
    ],
  },
  {
    id: "iranian-new-wave",
    name: "Iranian New Wave",
    family: "Movement",
    blurb:
      "Poetic realism made largely with children and non-actors, working around censorship by making the small domestic situation carry everything.",
    exemplars: [
      "Where Is the Friend's House?",
      "The Cow",
      "The Runner",
      "Bashu, the Little Stranger",
    ],
  },
  {
    id: "mumblecore",
    name: "Mumblecore",
    family: "Movement",
    blurb:
      "American micro-budget films of the 2000s: improvised dialogue, digital video, twenty-somethings failing to say what they mean, at length.",
    exemplars: [
      "Funny Ha Ha",
      "Hannah Takes the Stairs",
      "Computer Chess",
      "Humpday",
    ],
  },
  {
    id: "la-rebellion",
    name: "The L.A. Rebellion",
    family: "Movement",
    blurb:
      "Black filmmakers out of UCLA in the seventies who rejected Hollywood's terms entirely, borrowing from neorealism and African cinema instead.",
    exemplars: [
      "Killer of Sheep",
      "Daughters of the Dust",
      "Bush Mama",
      "To Sleep with Anger",
    ],
  },
  {
    id: "new-queer-cinema",
    name: "New Queer Cinema",
    family: "Movement",
    blurb:
      "Early-nineties films made in the middle of the AIDS crisis that refused respectability politics — formally aggressive, morally unapologetic.",
    exemplars: [
      "Paris Is Burning",
      "Poison",
      "My Own Private Idaho",
      "The Living End",
    ],
  },
  {
    id: "new-hollywood",
    name: "New Hollywood",
    family: "Movement",
    blurb:
      "The decade the studios lost control and handed it to film-school directors: downbeat endings, location shooting, and protagonists who lose.",
    exemplars: [
      "The Godfather",
      "Chinatown",
      "Taxi Driver",
      "Easy Rider",
    ],
  },
  {
    id: "silent-era",
    name: "The Silent Era",
    family: "Era",
    blurb:
      "Cinema before it could speak, and therefore fluent in everything else: gesture, cutting, camera movement, and a physical comedy nobody has bettered.",
    exemplars: [
      "Sunrise: A Song of Two Humans",
      "The General",
      "City Lights",
      "The Passion of Joan of Arc",
    ],
  },
  {
    id: "pre-code",
    name: "Pre-Code Hollywood",
    family: "Era",
    blurb:
      "The five years between sound and the enforcement of the Production Code, when American films were briefly allowed sex, cynicism and unpunished crime.",
    exemplars: [
      "Baby Face",
      "Scarface",
      "Trouble in Paradise",
      "I Am a Fugitive from a Chain Gang",
    ],
  },
  {
    id: "post-war-hollywood",
    name: "Post-War Hollywood",
    family: "Era",
    blurb:
      "Returning soldiers, housing shortages and a new pessimism working its way into studio pictures that were still, officially, entertainments.",
    exemplars: [
      "The Best Years of Our Lives",
      "Sunset Boulevard",
      "Its a Wonderful Life",
      "In a Lonely Place",
    ],
  },
  {
    id: "blockbuster-eighties",
    name: "The Blockbuster Eighties",
    family: "Era",
    blurb:
      "High-concept, wide-release, merchandised. The decade the summer movie became the business model and everything else became counter-programming.",
    exemplars: [
      "Back to the Future",
      "Raiders of the Lost Ark",
      "Die Hard",
      "E.T. the Extra-Terrestrial",
    ],
  },
  {
    id: "nineties-indie",
    name: "The Nineties Independent Boom",
    family: "Era",
    blurb:
      "Sundance, Miramax and a generation who financed first features on credit cards, briefly making the American independent film a commercial category.",
    exemplars: [
      "Clerks",
      "Reservoir Dogs",
      "Slacker",
      "Welcome to the Dollhouse",
    ],
  },
  {
    id: "y2k-anxiety",
    name: "Y2K & Millennium Anxiety",
    family: "Era",
    blurb:
      "Films made either side of 2000 about simulation, corporate dread and the suspicion that the whole arrangement was fake.",
    exemplars: [
      "The Matrix",
      "Fight Club",
      "American Beauty",
      "eXistenZ",
    ],
  },
  {
    id: "roaring-twenties",
    name: "The Roaring Twenties",
    family: "Era",
    blurb:
      "Prohibition, jazz, new money and the crash waiting at the end of it — a decade cinema keeps returning to for the costumes and the moral.",
    exemplars: [
      "The Great Gatsby",
      "Some Like It Hot",
      "Chicago",
      "Millers Crossing",
    ],
  },
  {
    id: "victorian-era",
    name: "Victorian Era Movies",
    family: "Era",
    blurb:
      "Gaslight, empire, and repression — a setting that gives a film both period spectacle and a ready-made argument about what people were forbidden to say.",
    exemplars: [
      "The Piano",
      "Bram Stokers Dracula",
      "The Age of Innocence",
      "Sherlock Holmes",
    ],
  },
  {
    id: "medieval",
    name: "Medieval Movies",
    family: "Era",
    blurb:
      "Mud, faith and violence. Whether played straight or as farce, the period asks what people do when the institutions holding them together are the only ones there are.",
    exemplars: [
      "The Seventh Seal",
      "Monty Python and the Holy Grail",
      "The Name of the Rose",
      "The Green Knight",
    ],
  },
  {
    id: "depression-era",
    name: "Depression-Era America",
    family: "Era",
    blurb:
      "Dust, migration and New Deal desperation, filmed either as social protest or as the backdrop for people who decided to rob banks instead.",
    exemplars: [
      "The Grapes of Wrath",
      "Bonnie and Clyde",
      "Paper Moon",
      "O Brother, Where Art Thou?",
    ],
  },
  {
    id: "swinging-sixties",
    name: "The Swinging Sixties",
    family: "Era",
    blurb:
      "Pop art, permissiveness and a youth culture that films had to keep up with — usually shot in colour that has aged into its own signature.",
    exemplars: [
      "Blow-Up",
      "A Hard Days Night",
      "Alfie",
      "If....",
    ],
  },
  {
    id: "streaming-era",
    name: "The Streaming Era",
    family: "Era",
    blurb:
      "Films made for the algorithm and the living room rather than the multiplex: longer, stranger, and released without a weekend to open on.",
    exemplars: [
      "Roma",
      "The Irishman",
      "Everything Everywhere All at Once",
      "Marriage Story",
    ],
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
