void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 color = vec3(0.5, 0.7, 0.9); // Base color for the climbing wall

    // Simulate some lighting effects
    float lightIntensity = max(dot(normalize(vec3(0.0, 1.0, 1.0)), vec3(0.0, 1.0, 0.0)), 0.0);
    color *= lightIntensity;

    // Add some texture or pattern to the climbing wall
    float pattern = sin(uv.x * 10.0) * cos(uv.y * 10.0);
    color += vec3(pattern * 0.1);

    gl_FragColor = vec4(color, 1.0);
}