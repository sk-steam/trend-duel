// These are invented gameplay examples, not measured Google Trends values.
export const duels = [
  ['Bitcoin','₿','TECH & MONEY',78,'Money Heist','🎭','ON SCREEN',43,'2021','Worldwide'],
  ['Barbie','🎀','ON SCREEN',86,'Oppenheimer','💥','ON SCREEN',64,'July 2023','Worldwide'],
  ['Minecraft','⛏️','GAMING',88,'Fortnite','🎮','GAMING',63,'2022','United States'],
  ['Taylor Swift','🎤','MUSIC',92,'Beyoncé','🪩','MUSIC',56,'2023','United States'],
  ['ChatGPT','✳','TECH',84,'Metaverse','🌐','TECH',18,'2023','Worldwide'],
  ['Squid Game','🔺','ON SCREEN',95,'Bridgerton','👑','ON SCREEN',36,'October 2021','Worldwide'],
  ['Wordle','🟩','INTERNET',89,'Sudoku','🔢','PUZZLES',28,'February 2022','United States'],
  ['Wednesday','🖤','ON SCREEN',81,'Stranger Things','📺','ON SCREEN',39,'December 2022','Worldwide'],
  ['Olympics','🏅','SPORT',93,'Super Bowl','🏈','SPORT',22,'August 2024','Worldwide'],
  ['Threads','🧵','SOCIAL',72,'Bluesky','🦋','SOCIAL',24,'July 2023','Worldwide'],
  ['Dune','🏜️','ON SCREEN',84,'Wonka','🍫','ON SCREEN',25,'March 2024','Worldwide'],
  ['Pokémon Go','📍','GAMING',97,'Clash Royale','⚔️','GAMING',47,'July 2016','Worldwide'],
  ['Among Us','🚀','GAMING',87,'Fall Guys','🏃','GAMING',51,'September 2020','Worldwide'],
  ['Eurovision','🎶','MUSIC',91,'Coachella','🌴','MUSIC',32,'May 2023','Worldwide']
].map((r,i)=>({id:`demo-${i}`,topics:[{name:r[0],icon:r[1],category:r[2],value:r[3]},{name:r[4],icon:r[5],category:r[6],value:r[7]}],period:r[8],region:r[9],demo:true}));
export const peaks = [
  {year:2023,peak:'July',answer:'Barbie',options:['Barbie','Wordle','Squid Game','Eurovision'],values:[8,9,12,17,19,32,100,49,24,17,12,13],note:'The Barbie movie arrived in cinemas in July 2023.'},
  {year:2022,peak:'February',answer:'Wordle',options:['ChatGPT','Wordle','Threads','Pokémon Go'],values:[64,100,75,52,38,32,29,25,24,23,22,21],note:'Wordle became a daily ritual for millions early in 2022.'},
  {year:2021,peak:'October',answer:'Squid Game',options:['Bridgerton','Wednesday','Squid Game','Dune'],values:[1,1,1,1,2,1,2,3,55,100,31,12],note:'Squid Game became a global phenomenon after its September 2021 release.'},
  {year:2016,peak:'July',answer:'Pokémon Go',options:['Fortnite','Pokémon Go','Among Us','Minecraft'],values:[2,2,3,3,4,8,100,55,23,14,10,9],note:'Pokémon Go launched in July 2016.'},
  {year:2023,peak:'July',answer:'Threads',options:['Bluesky','TikTok','Threads','Vine'],values:[2,2,3,3,4,5,100,24,12,10,9,8],note:'Meta launched Threads in July 2023.'},
  {year:2024,peak:'August',answer:'Paris Olympics',options:['Super Bowl','Paris Olympics','Wimbledon','Eurovision'],values:[5,6,7,9,11,17,79,100,15,8,6,5],note:'The Paris Olympics ran from July 26 to August 11, 2024.'},
  {year:2022,peak:'December',answer:'Wednesday',options:['Wednesday','Barbie','Oppenheimer','Squid Game'],values:[2,2,3,2,3,4,3,6,9,12,54,100],note:'Wednesday debuted on Netflix in late November 2022.'},
  {year:2020,peak:'September',answer:'Among Us',options:['Fall Guys','Among Us','Wordle','Threads'],values:[2,2,3,4,5,7,14,43,100,80,57,39],note:'Among Us exploded in popularity during 2020.'},
  {year:2024,peak:'March',answer:'Dune: Part Two',options:['Dune: Part Two','Wonka','Barbie','Wednesday'],values:[14,41,100,39,19,12,9,8,7,6,6,8],note:'Dune: Part Two reached cinemas in March 2024.'},
  {year:2023,peak:'May',answer:'Eurovision',options:['Coachella','Eurovision','Super Bowl','Oscars'],values:[5,9,13,25,100,17,7,5,4,4,4,5],note:'Liverpool hosted the Eurovision Song Contest in May 2023.'}
];
