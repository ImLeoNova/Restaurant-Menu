#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi


if [ -n "$SUDO" ] && ! sudo -n true 2>/dev/null; then
  echo "This script requires passwordless sudo (NOPASSWD) for user $(whoami)." >&2
  echo "Add the following to /etc/sudoers.d/deploy on the server:" >&2
  echo "  $(whoami) ALL=(ALL) NOPASSWD:ALL" >&2
  exit 1
fi

$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl gnupg lsb-release git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
$SUDO chmod a+r /etc/apt/keyrings/docker.gpg

$SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable
EOF

$SUDO apt-get update
$SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
$SUDO systemctl enable --now docker
$SUDO usermod -aG docker "$USER"

echo "Docker installation completed."
echo "NOTE: Group membership for 'docker' won't take effect in this SSH session."
echo "deploy.sh will fall back to 'sudo docker' automatically for this run."