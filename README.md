# Spelling Bee Practice - A site to help you prepare for spelling bees at a CCSS-CA (California's Common Core State Standards) 4th to 6th grade level.

## Appearance (looks will differ depending on screen size, but the middle panel will always look the same/similar):
<img width="2545" height="1213" alt="Screenshot 2026-02-07 at 6 29 00 PM" src="https://github.com/user-attachments/assets/0c117212-21c0-479b-a44b-9dc6a309c385" />

## Features: 
- Multiple difficulty modes including easy (7 or less letters), hard (more than 7 letters), and practice (frequently incorrect words).
- Auto-grading 
- Button to manually add words to practice mode.
- A clear cache button to reset all progress.
- Ability to get the word spoken slower, the word in a sentence, the word's meaning, and obviously the word itself (using built-in text-to-speech)

## Offline Use:
### Note: you can't simply open the index.html file as on many Operating Systems, the built-in Text-to-Speech for your browser won't work locally. Instead, you'll need to set up a local server, the simplest way being using python (instructions below).
- Initial Step: You need to have Python installed (you can get it here: https://www.python.org/downloads/), make sure to get the latest version. To check if you have python installed enter "python3 --version" or "python --version" into your terminal.
- Install the latest release of the software.
- Open up the folder in your terminal directory. (Use the cd command, for example, if the file is stored in a folder called "Bee" which is stored in another folder called "Desktop", the command would be "cd Desktop/Bee".)
- Once you are in the correct directory, enter the command "python3 -m http.server". If this doesn't work, you can try "python -m http.server". If neither works, ensure you have python installed and working. Once again, to check if you have python working enter "python3 --version" or "python --version" into your terminal.
- Now go to http://localhost:8000/. If it doesn't work, go here (https://www.youtube.com/watch?v=gwhG7rar2gU) or here (https://stackoverflow.com/questions/41810407/localhost8000-resolves-to-localhost-and-this-site-cant-be-reached-but-localh) for potential solutions. If this doesn't solve your problems, just search up your error message on Google.
- You are all done!

## For online use, all instructions are already on the website.
