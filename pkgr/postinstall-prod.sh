sudo sed -i '1s/^/server 169.254.169.123 prefer iburst\n/' /etc/chrony/chrony.conf
sudo service chrony restart
sudo solapi-desktop-app-demo scale web=1
