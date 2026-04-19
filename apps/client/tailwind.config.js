export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#182126",
                mist: "#f7f2e7",
                sand: "#efe3cf",
                lagoon: "#1f6f78",
                amber: "#ea9f42",
                coral: "#d86b52",
            },
            boxShadow: {
                glow: "0 24px 80px rgba(24, 33, 38, 0.16)",
            },
            borderRadius: {
                shell: "28px",
            },
            backgroundImage: {
                grain: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 22%), radial-gradient(circle at 80% 0%, rgba(31,111,120,0.18), transparent 28%), linear-gradient(135deg, rgba(239,227,207,0.98), rgba(247,242,231,0.94))",
            },
        },
    },
    plugins: [],
};
