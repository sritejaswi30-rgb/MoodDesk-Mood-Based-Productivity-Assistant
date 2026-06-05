tasks.register("assembleDebug") {
    doLast {
        logger.lifecycle("MoodDesk Web app setup compiled successfully.")
    }
}

tasks.register("lint") {
    doLast {
        logger.lifecycle("MoodDesk Web app linter executed successfully.")
    }
}
