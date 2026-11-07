/**
 * Everything you can find on the globe: where it is, what it is, and what to tell a 5–8 year old about it.
 * lat/lon are real locations (sea creatures and boats are placed just offshore).
 */
export type PlaceKind = 'landmark' | 'nature' | 'animal' | 'sea' | 'dino' | 'space' | 'boat';

export type Anim = 'none' | 'walk' | 'swim' | 'whale' | 'dive' | 'sail' | 'launch' | 'spin' | 'bob';

export interface Place {
  id: string;
  /** model to use, if not the same as id */
  model?: string;
  name: string;
  kind: PlaceKind;
  emoji: string;
  lat: number;
  lon: number;
  /** ISO country code for the flag ('' for open ocean) */
  cc: string;
  where: string;
  /** short "what is it" line */
  what: string;
  fact: string;
  eats?: string;
  lived?: string;
  /** model height in globe units (before zoom scaling) */
  size?: number;
  /** compass direction the model faces, degrees (0 = towards the viewer / south) */
  heading?: number;
  /** 1 = shows from further out, 3 = only up close */
  rank?: 1 | 2 | 3;
  anim?: Anim;
  atSea?: boolean;
}

export const PLACES: Place[] = [
  // ------------------------------------------------------------- landmarks
  { id: 'eiffel', name: 'Eiffel Tower', kind: 'landmark', emoji: '🗼', lat: 48.858, lon: 2.294, cc: 'FR', where: 'Paris, France', what: 'A giant iron tower', fact: 'It was built for a world fair in 1889. Every 7 years, painters give it a fresh coat of paint!', rank: 1 },
  { id: 'pyramids', name: 'Pyramids of Giza', kind: 'landmark', emoji: '🔺', lat: 29.979, lon: 31.134, cc: 'EG', where: 'Giza, Egypt', what: 'Giant stone tombs for pharaohs', fact: 'The Great Pyramid was the tallest building in the world for about 3,800 years!', rank: 1, heading: 20 },
  { id: 'liberty', name: 'Statue of Liberty', kind: 'landmark', emoji: '🗽', lat: 40.689, lon: -74.045, cc: 'US', where: 'New York, USA', what: 'A giant copper statue', fact: 'She was a gift from France in 1886. Her copper skin slowly turned green!', rank: 1 },
  { id: 'greatwall', name: 'Great Wall of China', kind: 'landmark', emoji: '🧱', lat: 40.43, lon: 116.57, cc: 'CN', where: 'Northern China', what: 'A very, very long wall', fact: 'It is thousands of kilometers long and was built over hundreds of years to protect China.', rank: 1 },
  { id: 'tajmahal', name: 'Taj Mahal', kind: 'landmark', emoji: '🕌', lat: 27.175, lon: 78.042, cc: 'IN', where: 'Agra, India', what: 'A white marble palace-tomb', fact: 'An emperor built it in memory of his wife. Its white marble glows pink at sunrise!', rank: 1 },
  { id: 'bigben', name: 'Big Ben', kind: 'landmark', emoji: '🕰️', lat: 51.501, lon: -0.125, cc: 'GB', where: 'London, United Kingdom', what: 'A famous clock tower', fact: 'Big Ben is really the giant bell inside the tower. It weighs about as much as two elephants!', rank: 1, heading: -20 },
  { id: 'colosseum', name: 'Colosseum', kind: 'landmark', emoji: '🏟️', lat: 41.89, lon: 12.492, cc: 'IT', where: 'Rome, Italy', what: 'An ancient stadium', fact: 'Nearly 2,000 years ago, about 50,000 people came here to watch shows!', rank: 1 },
  { id: 'pisa', name: 'Leaning Tower of Pisa', kind: 'landmark', emoji: '🏛️', lat: 43.723, lon: 10.396, cc: 'IT', where: 'Pisa, Italy', what: 'A tower that leans', fact: 'It started leaning while it was still being built, because the ground under it is soft!', rank: 2 },
  { id: 'operahouse', name: 'Sydney Opera House', kind: 'landmark', emoji: '🎭', lat: -33.857, lon: 151.215, cc: 'AU', where: 'Sydney, Australia', what: 'A concert hall by the sea', fact: 'Its roof looks like giant sails and is covered with more than a million tiles!', rank: 1, heading: -30 },
  { id: 'christ', name: 'Christ the Redeemer', kind: 'landmark', emoji: '⛰️', lat: -22.952, lon: -43.211, cc: 'BR', where: 'Rio de Janeiro, Brazil', what: 'A giant statue on a mountain', fact: 'The statue is about 30 meters tall, and its arms stretch 28 meters wide!', rank: 1 },
  { id: 'goldengate', name: 'Golden Gate Bridge', kind: 'landmark', emoji: '🌉', lat: 37.82, lon: -122.478, cc: 'US', where: 'San Francisco, USA', what: 'A famous red bridge', fact: "It's painted a color called International Orange so ships can see it in the fog.", rank: 1, heading: 70 },
  { id: 'burj', name: 'Burj Khalifa', kind: 'landmark', emoji: '🏙️', lat: 25.197, lon: 55.274, cc: 'AE', where: 'Dubai, United Arab Emirates', what: 'The tallest building in the world', fact: "It's 828 meters tall — that's more than twice as tall as the Eiffel Tower!", rank: 1, size: 0.05 },
  { id: 'machupicchu', name: 'Machu Picchu', kind: 'landmark', emoji: '⛰️', lat: -13.163, lon: -72.545, cc: 'PE', where: 'Andes Mountains, Peru', what: 'An old Inca city', fact: 'The Inca built it about 600 years ago, high up in the mountains.', rank: 1 },
  { id: 'moai', name: 'Moai Statues', kind: 'landmark', emoji: '🗿', lat: -27.125, lon: -109.277, cc: 'CL', where: 'Easter Island, Chile', what: 'Giant stone heads', fact: 'The Rapa Nui people carved almost 900 of these giant statues!', rank: 1 },
  { id: 'petra', name: 'Petra', kind: 'landmark', emoji: '🏜️', lat: 30.329, lon: 35.444, cc: 'JO', where: 'Jordan', what: 'A city carved into rock', fact: 'Petra is an old city carved right into pink rock cliffs!', rank: 2 },
  { id: 'angkor', name: 'Angkor Wat', kind: 'landmark', emoji: '🛕', lat: 13.412, lon: 103.867, cc: 'KH', where: 'Cambodia', what: 'A giant temple', fact: "It's the biggest temple in the world, and it's on Cambodia's flag!", rank: 1 },
  { id: 'stbasils', name: "St. Basil's Cathedral", kind: 'landmark', emoji: '⛪', lat: 55.752, lon: 37.623, cc: 'RU', where: 'Moscow, Russia', what: 'A church with colorful domes', fact: 'Its swirly onion-shaped domes look like candy! It was built more than 450 years ago.', rank: 1 },
  { id: 'neuschwanstein', name: 'Neuschwanstein Castle', kind: 'landmark', emoji: '🏰', lat: 47.557, lon: 10.75, cc: 'DE', where: 'Bavaria, Germany', what: 'A fairy-tale castle', fact: "This castle helped inspire Sleeping Beauty's castle at Disneyland!", rank: 2 },
  { id: 'windmills', name: 'Kinderdijk Windmills', kind: 'landmark', emoji: '🌬️', lat: 51.884, lon: 4.639, cc: 'NL', where: 'Netherlands', what: 'Old windmills', fact: 'These 19 windmills were built almost 300 years ago to pump water off the land.', rank: 2, anim: 'spin' },
  { id: 'chichenitza', name: 'Chichén Itzá', kind: 'landmark', emoji: '🔺', lat: 20.684, lon: -88.568, cc: 'MX', where: 'Yucatán, Mexico', what: 'A Maya pyramid', fact: 'The Maya built this pyramid. It has 365 steps — one for each day of the year!', rank: 1 },
  { id: 'sagrada', name: 'Sagrada Família', kind: 'landmark', emoji: '⛪', lat: 41.404, lon: 2.174, cc: 'ES', where: 'Barcelona, Spain', what: 'A huge church', fact: 'Builders started it in 1882 and have been working on it for more than 140 years!', rank: 2 },
  { id: 'parthenon', name: 'Parthenon', kind: 'landmark', emoji: '🏛️', lat: 37.972, lon: 23.727, cc: 'GR', where: 'Athens, Greece', what: 'An ancient temple', fact: 'This temple was built about 2,500 years ago for the goddess Athena.', rank: 1 },
  // ------------------------------------------------------------- nature wonders
  { id: 'fuji', name: 'Mount Fuji', kind: 'nature', emoji: '🗻', lat: 35.361, lon: 138.727, cc: 'JP', where: 'Japan', what: 'A volcano', fact: "Mount Fuji is a volcano, and it's the tallest mountain in Japan.", rank: 1 },
  { id: 'everest', name: 'Mount Everest', kind: 'nature', emoji: '🏔️', lat: 27.988, lon: 86.925, cc: 'NP', where: 'Nepal and China', what: 'The tallest mountain on Earth', fact: "It's almost 9 kilometers high — the tallest mountain in the world!", rank: 1, size: 0.045 },
  { id: 'kilimanjaro', name: 'Mount Kilimanjaro', kind: 'nature', emoji: '🏔️', lat: -3.068, lon: 37.356, cc: 'TZ', where: 'Tanzania', what: 'The tallest mountain in Africa', fact: "It's so tall that there's snow on top, even though it's near the equator!", rank: 1 },
  { id: 'uluru', name: 'Uluru', kind: 'nature', emoji: '🪨', lat: -25.344, lon: 131.036, cc: 'AU', where: 'Central Australia', what: 'A giant red rock', fact: 'This huge red rock glows at sunset. It is sacred to the Anangu people.', rank: 1 },
  { id: 'grandcanyon', name: 'Grand Canyon', kind: 'nature', emoji: '🏜️', lat: 36.1, lon: -112.11, cc: 'US', where: 'Arizona, USA', what: 'A giant canyon', fact: 'A river carved it over millions of years. It is about 1.8 kilometers deep!', rank: 1, heading: 90 },
  { id: 'niagara', name: 'Niagara Falls', kind: 'nature', emoji: '💦', lat: 43.08, lon: -79.07, cc: 'CA', where: 'Canada and USA', what: 'Huge waterfalls', fact: 'Niagara Falls sits right on the border between Canada and the United States.', rank: 3 },
  { id: 'victoriafalls', name: 'Victoria Falls', kind: 'nature', emoji: '💦', lat: -17.925, lon: 25.857, cc: 'ZM', where: 'Zambia and Zimbabwe', what: 'A giant waterfall', fact: "Its local name means 'The Smoke That Thunders' because of its huge spray and roar!", rank: 2 },
  // ------------------------------------------------------------- space
  { id: 'kennedy', name: 'Kennedy Space Center', kind: 'space', emoji: '🚀', lat: 28.573, lon: -80.649, cc: 'US', where: 'Florida, USA', what: 'A rocket launch site', fact: 'Astronauts first blasted off to the Moon from here in 1969!', rank: 1, anim: 'launch' },
  { id: 'baikonur', name: 'Baikonur Cosmodrome', kind: 'space', emoji: '🚀', lat: 45.92, lon: 63.34, cc: 'KZ', where: 'Kazakhstan', what: 'A rocket launch site', fact: 'Yuri Gagarin became the very first person in space when he launched from here in 1961!', rank: 1, anim: 'launch' },
  { id: 'kourou', name: 'Guiana Space Centre', kind: 'space', emoji: '🚀', lat: 5.236, lon: -52.769, cc: 'GF', where: 'French Guiana', what: 'A rocket launch site', fact: "It's near the equator, where Earth's spin gives rockets an extra push!", rank: 2, anim: 'launch' },
  { id: 'tanegashima', name: 'Tanegashima Space Center', kind: 'space', emoji: '🚀', lat: 30.4, lon: 130.97, cc: 'JP', where: 'Tanegashima Island, Japan', what: 'A rocket launch site', fact: "Japan launches its rockets from this island, right next to the beach!", rank: 2, anim: 'launch' },
  { id: 'maunakea', name: 'Mauna Kea Observatories', kind: 'space', emoji: '🔭', lat: 19.823, lon: -155.469, cc: 'US', where: 'Hawaii, USA', what: 'Giant telescopes', fact: 'Big telescopes sit on top of a volcano, above most of the clouds, to look at the stars.', rank: 1 },
  { id: 'alma', name: 'ALMA Telescopes', kind: 'space', emoji: '📡', lat: -23.029, lon: -67.755, cc: 'CL', where: 'Atacama Desert, Chile', what: 'Radio telescopes', fact: 'Its 66 dishes listen to radio waves from space, high up in a very dry desert.', rank: 2 },
  { id: 'parkes', name: 'Parkes Radio Telescope', kind: 'space', emoji: '📡', lat: -32.998, lon: 148.262, cc: 'AU', where: 'New South Wales, Australia', what: 'A giant radio dish', fact: 'This dish helped send TV pictures of the first Moon landing to the whole world!', rank: 2 },
  // ------------------------------------------------------------- dinosaurs (fossil sites)
  { id: 'trex', name: 'Tyrannosaurus rex', kind: 'dino', emoji: '🦖', lat: 47.6, lon: -106.6, cc: 'US', where: 'Hell Creek, Montana, USA', what: 'A giant meat-eating dinosaur', fact: 'T. rex had teeth as big as bananas!', eats: 'Meat', lived: 'About 66 million years ago', rank: 1, heading: 50, anim: 'walk' },
  { id: 'triceratops', name: 'Triceratops', kind: 'dino', emoji: '🦕', lat: 46.3, lon: -104.4, cc: 'US', where: 'Hell Creek, Montana, USA', what: 'A three-horned dinosaur', fact: 'Triceratops lived at the same time and place as T. rex!', eats: 'Plants', lived: 'About 66 million years ago', rank: 2, heading: -40, anim: 'walk' },
  { id: 'styracosaurus', name: 'Styracosaurus', kind: 'dino', emoji: '🦕', lat: 50.76, lon: -111.49, cc: 'CA', where: 'Dinosaur Provincial Park, Canada', what: 'A spiky-frilled dinosaur', fact: 'Styracosaurus had long spikes around its frill, like a spiky crown!', eats: 'Plants', lived: 'About 75 million years ago', rank: 2, heading: 40, anim: 'walk' },
  { id: 'stegosaurus', name: 'Stegosaurus', kind: 'dino', emoji: '🦕', lat: 40.44, lon: -109.3, cc: 'US', where: 'Dinosaur National Monument, Utah, USA', what: 'A dinosaur with plates on its back', fact: 'Stegosaurus had big plates on its back and spikes on its tail. Its brain was only about the size of a lime!', eats: 'Plants', lived: 'About 150 million years ago', rank: 2, heading: 70, anim: 'walk' },
  { id: 'velociraptor', name: 'Velociraptor', kind: 'dino', emoji: '🦖', lat: 44.13, lon: 103.73, cc: 'MN', where: 'Gobi Desert, Mongolia', what: 'A small, fast dinosaur', fact: 'Velociraptor was about the size of a turkey, and it had feathers! Some of the first dinosaur eggs known to science were found here.', eats: 'Meat', lived: 'About 75 million years ago', rank: 1, heading: 40, anim: 'walk' },
  { id: 'argentinosaurus', name: 'Argentinosaurus', kind: 'dino', emoji: '🦕', lat: -38.95, lon: -68.06, cc: 'AR', where: 'Patagonia, Argentina', what: 'One of the biggest dinosaurs ever', fact: 'Argentinosaurus was about as long as three school buses!', eats: 'Plants', lived: 'About 95 million years ago', rank: 1, heading: 60, size: 0.045, anim: 'walk' },
  { id: 'giraffatitan', name: 'Giraffatitan', kind: 'dino', emoji: '🦕', lat: -9.7, lon: 39.3, cc: 'TZ', where: 'Tendaguru, Tanzania', what: 'A super-tall long-necked dinosaur', fact: 'Giraffatitan held its neck up high like a giraffe to munch leaves at the tops of trees!', eats: 'Plants', lived: 'About 150 million years ago', rank: 1, heading: 50, size: 0.045, anim: 'walk' },
  { id: 'iguanodon', name: 'Iguanodon', kind: 'dino', emoji: '🦖', lat: 50.65, lon: -1.3, cc: 'GB', where: 'Isle of Wight, United Kingdom', what: 'A dinosaur with spiky thumbs', fact: 'Iguanodon had spiky thumbs, and it was one of the very first dinosaurs ever discovered!', eats: 'Plants', lived: 'About 125 million years ago', rank: 3, heading: 40, anim: 'walk' },
  // ------------------------------------------------------------- animals
  { id: 'giraffe', name: 'Giraffe', kind: 'animal', emoji: '🦒', lat: -2.33, lon: 34.83, cc: 'TZ', where: 'Serengeti, Tanzania', what: 'The tallest animal', fact: "Giraffes are the tallest animals in the world. Their tongues are dark blue-purple!", eats: 'Leaves from tall trees', rank: 1, heading: 60, anim: 'walk' },
  { id: 'lion', name: 'Lion', kind: 'animal', emoji: '🦁', lat: -24.0, lon: 31.5, cc: 'ZA', where: 'Kruger National Park, South Africa', what: 'The king of the savanna', fact: "A lion's roar can be heard up to 8 kilometers away!", eats: 'Meat', rank: 2, heading: -50, anim: 'walk' },
  { id: 'elephant', name: 'African Elephant', kind: 'animal', emoji: '🐘', lat: -19.6, lon: 22.8, cc: 'BW', where: 'Okavango Delta, Botswana', what: 'The biggest land animal', fact: 'Elephants use their trunks like a hand, a nose and a drinking straw!', eats: 'Grass, leaves and fruit', rank: 1, heading: 50, anim: 'walk' },
  { id: 'hippo', name: 'Hippopotamus', kind: 'animal', emoji: '🦛', lat: -13.1, lon: 31.8, cc: 'ZM', where: 'Luangwa River, Zambia', what: 'A huge river animal', fact: "Hippos can't really swim — they walk and bounce along the river bottom!", eats: 'Grass', rank: 3, heading: 40, anim: 'bob' },
  { id: 'zebra', name: 'Zebra', kind: 'animal', emoji: '🦓', lat: -18.9, lon: 16.0, cc: 'NA', where: 'Etosha, Namibia', what: 'A stripy horse', fact: 'No two zebras have exactly the same stripes!', eats: 'Grass', rank: 2, heading: -60, anim: 'walk' },
  { id: 'gorilla', name: 'Mountain Gorilla', kind: 'animal', emoji: '🦍', lat: -1.45, lon: 29.5, cc: 'RW', where: 'Virunga Mountains, Rwanda', what: 'The biggest ape', fact: 'Gorillas build a fresh bed of leaves to sleep in every night!', eats: 'Leaves, stems and fruit', rank: 2, heading: 20, anim: 'bob' },
  { id: 'lemur', name: 'Ring-tailed Lemur', kind: 'animal', emoji: '🐒', lat: -20.0, lon: 46.5, cc: 'MG', where: 'Madagascar', what: 'A stripy-tailed animal', fact: 'Lemurs sunbathe in the morning with their arms stretched out wide!', eats: 'Fruit and leaves', rank: 1, heading: 60, anim: 'walk' },
  { id: 'camel', name: 'Camel', kind: 'animal', emoji: '🐪', lat: 26.0, lon: 3.0, cc: 'DZ', where: 'Sahara Desert, Algeria', what: 'A desert animal with a hump', fact: "A camel's hump stores fat, not water!", eats: 'Desert plants', rank: 1, heading: 70, anim: 'walk' },
  { id: 'panda', name: 'Giant Panda', kind: 'animal', emoji: '🐼', lat: 31.0, lon: 103.2, cc: 'CN', where: 'Sichuan, China', what: 'A black-and-white bear', fact: 'Pandas spend about 12 hours a day eating bamboo!', eats: 'Bamboo', rank: 1, heading: 30, anim: 'bob' },
  { id: 'tiger', name: 'Bengal Tiger', kind: 'animal', emoji: '🐅', lat: 21.9, lon: 89.2, cc: 'BD', where: 'Sundarbans, Bangladesh and India', what: 'The biggest wild cat', fact: 'Tigers love water and are great swimmers!', eats: 'Meat', rank: 1, heading: 60, anim: 'walk' },
  { id: 'orangutan', name: 'Orangutan', kind: 'animal', emoji: '🦧', lat: 1.0, lon: 114.0, cc: 'MY', where: 'Borneo', what: 'An orange ape', fact: 'Orangutans spend most of their lives up in the trees.', eats: 'Fruit', rank: 1, heading: 20, anim: 'bob' },
  { id: 'komodo', name: 'Komodo Dragon', kind: 'animal', emoji: '🦎', lat: -8.55, lon: 119.49, cc: 'ID', where: 'Komodo Island, Indonesia', what: 'The biggest lizard', fact: 'Komodo dragons are the biggest lizards in the world!', eats: 'Meat', rank: 2, heading: 60, anim: 'walk' },
  { id: 'kangaroo', name: 'Kangaroo', kind: 'animal', emoji: '🦘', lat: -30.0, lon: 140.0, cc: 'AU', where: 'Australian Outback', what: 'A hopping animal', fact: 'Baby kangaroos, called joeys, ride around in their mom\'s pouch!', eats: 'Grass', rank: 1, heading: 60, anim: 'walk' },
  { id: 'koala', name: 'Koala', kind: 'animal', emoji: '🐨', lat: -27.5, lon: 152.5, cc: 'AU', where: 'Queensland, Australia', what: 'A fluffy tree-hugger', fact: 'Koalas sleep up to 20 hours a day!', eats: 'Eucalyptus leaves', rank: 2, heading: 20, anim: 'bob' },
  { id: 'kiwi', name: 'Kiwi', kind: 'animal', emoji: '🥝', lat: -39.3, lon: 175.6, cc: 'NZ', where: 'New Zealand', what: "A bird that can't fly", fact: "The kiwi can't fly, and it has nostrils at the tip of its long beak!", eats: 'Worms and bugs', rank: 1, heading: 60, anim: 'walk' },
  { id: 'penguins', name: 'Emperor Penguins', kind: 'animal', emoji: '🐧', lat: -77.5, lon: 166.0, cc: 'AQ', where: 'Ross Sea, Antarctica', what: 'The biggest penguins', fact: 'Emperor penguin dads keep the egg warm on their feet all winter!', eats: 'Fish, squid and krill', rank: 1, heading: 0, anim: 'bob' },
  { id: 'polarbear', name: 'Polar Bear', kind: 'animal', emoji: '🐻‍❄️', lat: 58.77, lon: -94.17, cc: 'CA', where: 'Churchill, Canada', what: 'A big white bear', fact: 'Polar bears have black skin under their white fur to soak up the sun!', eats: 'Seals', rank: 1, heading: 60, anim: 'walk' },
  { id: 'moose', name: 'Moose', kind: 'animal', emoji: '🫎', lat: 61.0, lon: -135.0, cc: 'CA', where: 'Yukon, Canada', what: 'The biggest deer', fact: 'Moose are the biggest deer in the world, and they are great swimmers!', eats: 'Leaves, twigs and water plants', rank: 1, heading: 60, anim: 'walk' },
  { id: 'brownbear', name: 'Brown Bear', kind: 'animal', emoji: '🐻', lat: 58.6, lon: -155.0, cc: 'US', where: 'Alaska, USA', what: 'A big furry bear', fact: 'In Alaska, brown bears catch salmon jumping up waterfalls!', eats: 'Fish and berries', rank: 2, heading: 30, anim: 'bob' },
  { id: 'bison', name: 'Bison', kind: 'animal', emoji: '🦬', lat: 44.6, lon: -110.5, cc: 'US', where: 'Yellowstone, USA', what: 'A big shaggy animal', fact: 'Bison are the biggest land animals in North America!', eats: 'Grass', rank: 1, heading: 60, anim: 'walk' },
  { id: 'llama', name: 'Llama', kind: 'animal', emoji: '🦙', lat: -15.5, lon: -70.1, cc: 'PE', where: 'Andes Mountains, Peru', what: 'A fluffy mountain animal', fact: 'Llamas hum to talk to each other!', eats: 'Grass', rank: 2, heading: 60, anim: 'walk' },
  { id: 'jaguar', name: 'Jaguar', kind: 'animal', emoji: '🐆', lat: -17.5, lon: -57.0, cc: 'BR', where: 'Pantanal, Brazil', what: 'A spotted big cat', fact: 'Unlike most cats, jaguars love water and are great swimmers!', eats: 'Meat and fish', rank: 2, heading: 60, anim: 'walk' },
  { id: 'toucan', name: 'Toucan', kind: 'animal', emoji: '🦜', lat: -3.4, lon: -62.0, cc: 'BR', where: 'Amazon Rainforest, Brazil', what: 'A bird with a giant beak', fact: "A toucan's big colorful beak is very light, because it's hollow inside!", eats: 'Fruit', rank: 1, heading: 50, anim: 'bob' },
  { id: 'sloth', name: 'Sloth', kind: 'animal', emoji: '🦥', lat: 10.3, lon: -84.8, cc: 'CR', where: 'Costa Rica', what: 'A very slow animal', fact: 'Sloths move so slowly that tiny green plants grow in their fur!', eats: 'Leaves', rank: 2, heading: 20, anim: 'bob' },
  { id: 'reindeer', name: 'Reindeer', kind: 'animal', emoji: '🦌', lat: 68.0, lon: 26.0, cc: 'FI', where: 'Lapland, Finland', what: 'A deer of the snowy north', fact: 'In winter, Arctic reindeer eyes change color from gold to blue!', eats: 'Lichen, a kind of moss', rank: 1, heading: 60, anim: 'walk' },
  // ------------------------------------------------------------- sea creatures
  { id: 'bluewhale', name: 'Blue Whale', kind: 'sea', emoji: '🐋', lat: 33.0, lon: -123.0, cc: '', where: 'Pacific Ocean, off California', what: 'The biggest animal ever', fact: 'The blue whale is the biggest animal that has ever lived — even bigger than the dinosaurs!', eats: 'Tiny krill', rank: 1, heading: 60, anim: 'whale', atSea: true, size: 0.045 },
  { id: 'humpback', name: 'Humpback Whale', kind: 'sea', emoji: '🐳', lat: 20.5, lon: -156.9, cc: '', where: 'Pacific Ocean, near Hawaii', what: 'A singing whale', fact: 'Humpback whales sing long songs that travel far through the ocean.', eats: 'Krill and small fish', rank: 1, heading: 100, anim: 'whale', atSea: true },
  { id: 'orca', name: 'Orca', kind: 'sea', emoji: '🐋', lat: 48.6, lon: -126.6, cc: '', where: 'Pacific Ocean, off Canada', what: 'A killer whale', fact: 'Orcas live in family groups called pods, and each pod has its own way of calling.', eats: 'Fish and seals', rank: 2, heading: 70, anim: 'whale', atSea: true },
  { id: 'shark', name: 'Great White Shark', kind: 'sea', emoji: '🦈', lat: -35.2, lon: 19.6, cc: '', where: 'Ocean off South Africa', what: 'A big ocean hunter', fact: 'Great white sharks have about 300 teeth, and they lose and grow new ones all the time!', eats: 'Seals and fish', rank: 1, heading: 60, anim: 'swim', atSea: true },
  { id: 'seaturtle', name: 'Green Sea Turtle', kind: 'sea', emoji: '🐢', lat: -18.0, lon: 148.6, cc: 'AU', where: 'Great Barrier Reef, Australia', what: 'An ocean traveler', fact: 'Sea turtles swim thousands of kilometers, then come back to the beach where they hatched to lay their eggs!', eats: 'Sea grass', rank: 1, heading: 40, anim: 'swim', atSea: true },
  { id: 'reef', name: 'Clownfish Reef', kind: 'sea', emoji: '🐠', lat: -15.6, lon: 146.6, cc: 'AU', where: 'Great Barrier Reef, Australia', what: 'A colorful coral reef', fact: 'Clownfish live safely inside stinging sea anemones!', eats: 'Tiny sea creatures', rank: 2, anim: 'spin', atSea: true },
  { id: 'octopus', name: 'Octopus', kind: 'sea', emoji: '🐙', lat: 35.5, lon: 17.5, cc: '', where: 'Mediterranean Sea', what: 'An eight-armed sea animal', fact: 'An octopus has three hearts and blue blood!', eats: 'Crabs and shellfish', rank: 1, anim: 'bob', atSea: true },
  { id: 'dolphins', name: 'Dolphins', kind: 'sea', emoji: '🐬', lat: 26.5, lon: -88.0, cc: '', where: 'Gulf of Mexico', what: 'Clever, playful sea animals', fact: 'Dolphins sleep with half of their brain at a time, so they can keep swimming!', eats: 'Fish', rank: 1, heading: 60, anim: 'swim', atSea: true },
  { id: 'narwhal', name: 'Narwhal', kind: 'sea', emoji: '🦄', lat: 73.0, lon: -66.0, cc: '', where: 'Baffin Bay, Arctic', what: 'The unicorn of the sea', fact: "A narwhal's 'horn' is really a long tooth that grows through its lip!", eats: 'Fish', rank: 1, heading: 60, anim: 'swim', atSea: true },
  { id: 'mantaray', name: 'Manta Ray', kind: 'sea', emoji: '🐟', lat: 4.2, lon: 72.6, cc: 'MV', where: 'Maldives, Indian Ocean', what: 'A giant flat fish', fact: 'Manta rays have the biggest brains of any fish!', eats: 'Plankton', rank: 1, heading: 40, anim: 'swim', atSea: true },
  // ------------------------------------------------------------- boats
  { id: 'cruiseship', name: 'Cruise Ship', kind: 'boat', emoji: '🛳️', lat: 25.6, lon: -79.0, cc: 'BS', where: 'Bahamas, Caribbean', what: 'A floating vacation hotel', fact: 'The biggest cruise ships carry more than 6,000 passengers and have pools, water slides and even ice rinks!', rank: 1, heading: 70, anim: 'sail', atSea: true, size: 0.045 },
  { id: 'carrier', name: 'Aircraft Carrier', kind: 'boat', emoji: '✈️', lat: 32.5, lon: -117.6, cc: 'US', where: 'Pacific Ocean, off San Diego', what: 'A giant navy ship that carries planes', fact: 'An aircraft carrier is like a floating airport. Planes landing on it are stopped by a strong wire!', rank: 1, heading: 30, anim: 'sail', atSea: true, size: 0.045 },
  { id: 'carrier2', model: 'carrier', name: 'Aircraft Carrier', kind: 'boat', emoji: '✈️', lat: 36.8, lon: -74.9, cc: 'US', where: 'Atlantic Ocean, off Norfolk, Virginia', what: 'A giant navy ship that carries planes', fact: 'Norfolk, Virginia has the biggest navy base in the world, where many aircraft carriers live.', rank: 2, heading: 100, anim: 'sail', atSea: true, size: 0.045 },
  { id: 'submarine', name: 'Submarine', kind: 'boat', emoji: '🚢', lat: 21.0, lon: -158.6, cc: 'US', where: 'Pacific Ocean, near Pearl Harbor, Hawaii', what: 'A ship that goes underwater', fact: 'Submarines fill special tanks with water to sink, then blow the water out to float back up!', rank: 2, heading: -70, anim: 'dive', atSea: true },
  { id: 'containership', name: 'Container Ship', kind: 'boat', emoji: '🚢', lat: 1.6, lon: 104.7, cc: 'SG', where: 'Singapore Strait', what: 'A giant cargo ship', fact: 'Huge container ships carry thousands of big metal boxes full of toys, clothes and food around the world!', rank: 1, heading: 70, anim: 'sail', atSea: true, size: 0.045 },
];

export const KIND_LABEL: Record<PlaceKind, string> = {
  landmark: 'Landmark',
  nature: 'Natural wonder',
  animal: 'Animal',
  sea: 'Sea life',
  dino: 'Dinosaur',
  space: 'Space',
  boat: 'Boat',
};
