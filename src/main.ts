import Phaser from "phaser";
import "./style.css";
import { gameConfig } from "./game/config";
import { installDiagnosticsOverlay } from "./game/diagnostics";

const game = new Phaser.Game(gameConfig);
installDiagnosticsOverlay(game);
