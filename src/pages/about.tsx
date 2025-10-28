import React from 'react';

const About: React.FC = () => {
    return (
        <div className="about-container">
            <h1>About Me</h1>
            <p>
                I am a passionate boulderer and web developer with a love for creating interactive experiences. 
                My journey in climbing has taught me the importance of perseverance, creativity, and problem-solving.
            </p>
            <h2>Skills</h2>
            <ul>
                <li>JavaScript / TypeScript</li>
                <li>React / Next.js</li>
                <li>Three.js / Babylon.js</li>
                <li>CSS / Tailwind CSS</li>
                <li>3D Modeling</li>
            </ul>
        </div>
    );
};

export default About;